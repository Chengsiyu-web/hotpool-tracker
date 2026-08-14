import { supabase } from "@/integrations/supabase/client";
import { parseHeatToNumber, todayLocal } from "./hotspot-store";

/**
 * ═══════════════════════════════════════════════════════════════════
 * hotspot_pool 追踪池核心逻辑
 * ═══════════════════════════════════════════════════════════════════
 *
 * 数据模型要点：
 * - hotspot_pool：热点"追踪档案"，同一个热点跨多天扫描会被归一化到同一行，
 *   持续累积 appearances / days_active / peak_heat 等统计信息。
 * - hotspot_pool_snapshots：每次扫描处理后为该热点写入当天的快照（幂等，
 *   同一 pool_id + snapshot_date 只保留一条，重复写入按 upsert 覆盖）。
 * - hotspot_pool_directions：用户为某个池内热点生成/选定创作方向时的历史记录。
 *
 * 状态机：
 * - active：达到热度/持续/共振阈值的热点，值得优先创作
 * - cooling：曾经活跃但降温，或还没达标但仍在观察期
 * - archived：长期未上榜，归档不再展示
 *
 * 【关于错误处理】统一显式 throw，避免"看着成功、实际没写入"的静默失败。
 */

const POOL_TABLE = "hotspot_pool";
const SNAPSHOT_TABLE = "hotspot_pool_snapshots";
const DIRECTION_TABLE = "hotspot_pool_directions";

// 阈值常量
export const PEAK_HEAT_THRESHOLD = 50000000; // 峰值热度 ≥ 5000万
export const DAYS_ACTIVE_THRESHOLD = 3; // 连续/累计上榜天数 ≥ 3 天
export const RESONANCE_APPEARANCES_THRESHOLD = 5; // 多平台共振场景下，出现次数 ≥ 5 次

// 容量上限
export const ACTIVE_CAPACITY = 12;
export const COOLING_CAPACITY = 8;

// 状态降级窗口（天）
const ACTIVE_TO_COOLING_DAYS = 3;
const COOLING_TO_ARCHIVED_DAYS = 7;

/**
 * 标题归一化：去除标点符号、空白，统一小写，生成 canonical_key。
 */
export function normalizeTitle(title) {
  if (!title) return "";
  return String(title)
    .toLowerCase()
    .replace(/[，。！？、；：""''（）【】《》〈〉…—\-,.!?;:'"()[\]{}<>~`@#$%^&*_+=|\\/]/g, "")
    .replace(/[\s\u3000]/g, "")
    .trim();
}

/**
 * 判断一条追踪池记录是否达到"值得优先创作"的阈值。
 */
export function meetsThreshold(entry) {
  if (!entry) return false;
  const peakHeat = Number(entry.peak_heat_numeric || 0);
  const daysActive = Number(entry.days_active || 0);
  const appearances = Number(entry.appearances || 0);
  const resonance = Boolean(entry.resonance);

  if (peakHeat >= PEAK_HEAT_THRESHOLD) return true;
  if (daysActive >= DAYS_ACTIVE_THRESHOLD) return true;
  if (resonance && appearances >= RESONANCE_APPEARANCES_THRESHOLD) return true;
  return false;
}

/**
 * 计算两个日期字符串（YYYY-MM-DD）之间相差的自然天数（date2 - date1）。
 */
function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(`${dateStr1}T00:00:00`);
  const d2 = new Date(`${dateStr2}T00:00:00`);
  return Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * 处理一批扫描结果：归一化标题 → 匹配/创建追踪池记录 → 更新统计 → 写入快照 →
 * 重新评估全池状态（含降级：active→cooling→archived）。
 */
export async function processScanResults(hotspots, options = {}) {
  if (!Array.isArray(hotspots)) {
    throw new Error("processScanResults: hotspots 必须是数组");
  }

  const scanDate = options.scanDate || todayLocal();
  const stats = { processed: 0, created: 0, updated: 0, promoted: 0, demoted: 0 };

  for (let rank = 0; rank < hotspots.length; rank++) {
    const h = hotspots[rank];
    const title = h?.title || h?.name;
    if (!title) continue;

    const canonicalKey = normalizeTitle(title);
    if (!canonicalKey) continue;

    const heatNumeric =
      typeof h.heat_numeric === "number" && h.heat_numeric > 0
        ? h.heat_numeric
        : parseHeatToNumber(h.heat);

    const platforms = Array.isArray(h.platforms)
      ? h.platforms
      : h.platform
      ? [h.platform]
      : [];

    const resonance = Boolean(h.resonance) || platforms.length > 1;
    const fingerprint = Array.isArray(h.fingerprint) ? h.fingerprint : [];
    const eventCore = h.event_core || h.eventCore || "";

    // 查找是否已存在该热点的追踪记录
    const { data: existing, error: findError } = await supabase
      .from(POOL_TABLE)
      .select("*")
      .eq("canonical_key", canonicalKey)
      .maybeSingle();

    if (findError) {
      throw new Error(`追踪池查询失败（${title}）：${findError.message}`);
    }

    let poolEntry;

    if (existing) {
      const isNewDay = existing.last_seen_at
        ? daysBetween(String(existing.last_seen_at).slice(0, 10), scanDate) > 0
        : true;

      const nextPeakHeatNumeric = Math.max(Number(existing.peak_heat_numeric || 0), heatNumeric);
      const nextPeakHeat =
        nextPeakHeatNumeric > Number(existing.peak_heat_numeric || 0) ? h.heat || existing.peak_heat : existing.peak_heat;
      const mergedPlatforms = Array.from(new Set([...(existing.platforms || []), ...platforms]));
      const nextAppearances = Number(existing.appearances || 0) + 1;
      const nextDaysActive = isNewDay ? Number(existing.days_active || 0) + 1 : Number(existing.days_active || 0);
      const nextResonance = Boolean(existing.resonance) || resonance || mergedPlatforms.length > 1;

      const candidate = {
        ...existing,
        peak_heat_numeric: nextPeakHeatNumeric,
        peak_heat: nextPeakHeat,
        platforms: mergedPlatforms,
        appearances: nextAppearances,
        days_active: nextDaysActive,
        resonance: nextResonance,
        last_seen_at: new Date().toISOString(),
        event_core: eventCore || existing.event_core,
        fingerprint: fingerprint.length > 0 ? fingerprint : existing.fingerprint,
      };

      const nextStatus = resolveStatus(candidate, existing.status, scanDate);

      const { data: updated, error: updateError } = await supabase
        .from(POOL_TABLE)
        .update({
          peak_heat: candidate.peak_heat,
          peak_heat_numeric: candidate.peak_heat_numeric,
          platforms: candidate.platforms,
          appearances: candidate.appearances,
          days_active: candidate.days_active,
          resonance: candidate.resonance,
          last_seen_at: candidate.last_seen_at,
          event_core: candidate.event_core,
          fingerprint: candidate.fingerprint,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`追踪池更新失败（${title}）：${updateError.message}`);
      }

      if (nextStatus === "active" && existing.status !== "active") stats.promoted += 1;
      if (nextStatus !== "active" && existing.status === "active") stats.demoted += 1;

      poolEntry = updated;
      stats.updated += 1;
    } else {
      const initialCandidate = {
        peak_heat_numeric: heatNumeric,
        days_active: 1,
        appearances: 1,
        resonance,
      };
      const initialStatus = meetsThreshold(initialCandidate) ? "active" : "cooling";

      const { data: created, error: insertError } = await supabase
        .from(POOL_TABLE)
        .insert({
          title,
          canonical_key: canonicalKey,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          peak_heat: h.heat || "",
          peak_heat_numeric: heatNumeric,
          platforms,
          days_active: 1,
          appearances: 1,
          resonance,
          status: initialStatus,
          event_core: eventCore,
          fingerprint,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          const { data: raced } = await supabase
            .from(POOL_TABLE)
            .select("*")
            .eq("canonical_key", canonicalKey)
            .maybeSingle();
          poolEntry = raced;
        } else {
          throw new Error(`追踪池创建失败（${title}）：${insertError.message}`);
        }
      } else {
        poolEntry = created;
        stats.created += 1;
        if (initialStatus === "active") stats.promoted += 1;
      }
    }

    if (!poolEntry) continue;

    // 写入当日快照
    const { error: snapshotError } = await supabase.from(SNAPSHOT_TABLE).upsert(
      {
        pool_id: poolEntry.id,
        snapshot_date: scanDate,
        heat: h.heat || "",
        heat_numeric: heatNumeric,
        rank: rank + 1,
        platforms,
      },
      { onConflict: "pool_id,snapshot_date" }
    );

    if (snapshotError) {
      throw new Error(`快照写入失败（${title}）：${snapshotError.message}`);
    }

    stats.processed += 1;
  }

  // 降级/归档超时记录
  const demoteStats = await demoteStaleEntries(scanDate);
  stats.demoted += demoteStats.demoted;

  // 容量收敛
  await enforceCapacity();

  return stats;
}

function resolveStatus(candidate, currentStatus, scanDate) {
  if (currentStatus === "archived") {
    return meetsThreshold(candidate) ? "active" : "cooling";
  }
  if (meetsThreshold(candidate)) return "active";
  return currentStatus === "active" ? "active" : "cooling";
}

async function demoteStaleEntries(scanDate) {
  const stats = { demoted: 0 };

  const { data: rows, error } = await supabase
    .from(POOL_TABLE)
    .select("id, status, last_seen_at")
    .in("status", ["active", "cooling"]);

  if (error) {
    throw new Error(`追踪池降级检查失败：${error.message}`);
  }

  for (const row of rows || []) {
    const lastSeenDate = row.last_seen_at ? String(row.last_seen_at).slice(0, 10) : scanDate;
    const idleDays = daysBetween(lastSeenDate, scanDate);

    let nextStatus = row.status;
    if (row.status === "active" && idleDays > ACTIVE_TO_COOLING_DAYS) {
      nextStatus = "cooling";
    } else if (row.status === "cooling" && idleDays > COOLING_TO_ARCHIVED_DAYS) {
      nextStatus = "archived";
    }

    if (nextStatus !== row.status) {
      const { error: updateError } = await supabase
        .from(POOL_TABLE)
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", row.id);

      if (updateError) {
        throw new Error(`追踪池降级写入失败（id=${row.id}）：${updateError.message}`);
      }
      stats.demoted += 1;
    }
  }

  return stats;
}

async function enforceCapacity() {
  const { data: activeRows, error: activeError } = await supabase
    .from(POOL_TABLE)
    .select("id, peak_heat_numeric, days_active, last_seen_at")
    .eq("status", "active")
    .order("peak_heat_numeric", { ascending: false })
    .order("days_active", { ascending: false });

  if (activeError) throw new Error(`容量检查失败（active）：${activeError.message}`);

  if ((activeRows || []).length > ACTIVE_CAPACITY) {
    const overflow = activeRows.slice(ACTIVE_CAPACITY);
    const ids = overflow.map((r) => r.id);
    const { error: demoteError } = await supabase
      .from(POOL_TABLE)
      .update({ status: "cooling", updated_at: new Date().toISOString() })
      .in("id", ids);
    if (demoteError) throw new Error(`容量收敛失败（active→cooling）：${demoteError.message}`);
  }

  const { data: coolingRows, error: coolingError } = await supabase
    .from(POOL_TABLE)
    .select("id, peak_heat_numeric, days_active, last_seen_at")
    .eq("status", "cooling")
    .order("peak_heat_numeric", { ascending: false })
    .order("days_active", { ascending: false });

  if (coolingError) throw new Error(`容量检查失败（cooling）：${coolingError.message}`);

  if ((coolingRows || []).length > COOLING_CAPACITY) {
    const overflow = coolingRows.slice(COOLING_CAPACITY);
    const ids = overflow.map((r) => r.id);
    const { error: archiveError } = await supabase
      .from(POOL_TABLE)
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .in("id", ids);
    if (archiveError) throw new Error(`容量收敛失败（cooling→archived）：${archiveError.message}`);
  }
}

/**
 * 查询当前追踪池中值得展示的热点（active + cooling），active 排前面，
 * 组内按峰值热度降序。
 */
export async function fetchHotPool() {
  const { data, error } = await supabase
    .from(POOL_TABLE)
    .select("*")
    .in("status", ["active", "cooling"])
    .order("status", { ascending: true })
    .order("peak_heat_numeric", { ascending: false });

  if (error) {
    throw new Error(`追踪池读取失败：${error.message}`);
  }
  return data || [];
}

/**
 * 查询单个追踪池热点的详情，含最近 7 天快照与历史创作方向。
 */
export async function fetchPoolHotspotDetail(id) {
  if (!id) throw new Error("fetchPoolHotspotDetail: id 不能为空");

  const { data: pool, error: poolError } = await supabase
    .from(POOL_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (poolError) throw new Error(`追踪池详情读取失败：${poolError.message}`);
  if (!pool) return null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const pad = (n) => String(n).padStart(2, "0");
  const sevenDaysAgoStr = `${sevenDaysAgo.getFullYear()}-${pad(sevenDaysAgo.getMonth() + 1)}-${pad(sevenDaysAgo.getDate())}`;

  const { data: snapshots, error: snapshotError } = await supabase
    .from(SNAPSHOT_TABLE)
    .select("*")
    .eq("pool_id", id)
    .gte("snapshot_date", sevenDaysAgoStr)
    .order("snapshot_date", { ascending: false });

  if (snapshotError) throw new Error(`快照读取失败：${snapshotError.message}`);

  const { data: directions, error: directionError } = await supabase
    .from(DIRECTION_TABLE)
    .select("*")
    .eq("pool_id", id)
    .order("generated_at", { ascending: false });

  if (directionError) throw new Error(`创作方向历史读取失败：${directionError.message}`);

  return {
    pool,
    snapshots: snapshots || [],
    directions: directions || [],
  };
}

/**
 * 记录一次针对追踪池热点生成/选定的创作方向，并递增该热点的 total_directions 计数。
 */
export async function recordDirection(poolId, direction, tone = "", narrativeArc = "") {
  if (!poolId) throw new Error("recordDirection: poolId 不能为空");
  if (!direction) throw new Error("recordDirection: direction 不能为空");

  const { data: inserted, error: insertError } = await supabase
    .from(DIRECTION_TABLE)
    .insert({
      pool_id: poolId,
      direction_json: direction,
      tone,
      narrative_arc: narrativeArc,
    })
    .select()
    .single();

  if (insertError) throw new Error(`创作方向写入失败：${insertError.message}`);

  const { data: current, error: fetchError } = await supabase
    .from(POOL_TABLE)
    .select("total_directions")
    .eq("id", poolId)
    .maybeSingle();

  if (fetchError) throw new Error(`追踪池计数读取失败：${fetchError.message}`);

  const nextTotal = Number(current?.total_directions || 0) + 1;

  const { error: updateError } = await supabase
    .from(POOL_TABLE)
    .update({
      total_directions: nextTotal,
      last_direction_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", poolId);

  if (updateError) throw new Error(`追踪池计数更新失败：${updateError.message}`);

  return inserted;
}
