import { supabase } from "@/integrations/supabase/client";

/**
 * ═══════════════════════════════════════════════════════════════════
 * hotspot_results 表读写封装
 * ═══════════════════════════════════════════════════════════════════
 *
 * 数据模型要点：
 * - 每次扫榜（自动 or 手动）插入一行快照，从不覆盖历史行。热点是全局共享资源，
 *   一次扫榜产出的十几条热点可以被多次创作分别选用，因此它不属于任何一次创作会话。
 * - 用户选中某条热点的某个方向时，才通过 writing_sessions.hotspot_ref 建立关联。
 *
 * 【关于错误处理】supabase-js 的 insert/update 失败时不抛异常，只在返回值里带
 * { error }。本模块统一改为显式抛出，让失败在第一时间可见。
 */

const TABLE = "hotspot_results";

/** 把 "123.4万" / "1.2亿" 这类热度字符串转成可比较的数字 */
export function parseHeatToNumber(heat) {
  if (heat === null || heat === undefined) return 0;
  if (typeof heat === "number") return Number.isFinite(heat) ? heat : 0;
  const s = String(heat).trim();
  if (!s || s === "—" || s === "-") return 0;
  const num = parseFloat(s.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num)) return 0;
  if (s.includes("亿")) return Math.round(num * 100000000);
  if (s.includes("万")) return Math.round(num * 10000);
  return Math.round(num);
}

/** 本地时区的 YYYY-MM-DD（不能用 toISOString，那是 UTC，跨零点会错一天） */
export function todayLocal() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * 读取最新一条可用的扫榜快照（success 或 partial）。
 * @returns {Promise<object|null>}
 */
export async function fetchLatestHotspots() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .in("status", ["success", "partial"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(`热点数据读取失败：${error.message}`);
  return data && data.length > 0 ? data[0] : null;
}

/**
 * 查询今天是否已有自动扫榜的成功记录。
 * @returns {Promise<object|null>}
 */
export async function fetchTodayCronResult() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("scan_date", todayLocal())
    .eq("source", "cron")
    .eq("status", "success")
    .limit(1);

  if (error) throw new Error(`今日热点检查失败：${error.message}`);
  return data && data.length > 0 ? data[0] : null;
}

/**
 * 历史快照列表（供"查看历史扫榜"用）。
 * @param {number} limit
 */
export async function fetchHotspotHistory(limit = 20) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, created_at, source, scan_date, status, hotspots")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`历史快照读取失败：${error.message}`);
  return (data || []).map((row) => ({
    ...row,
    hotspot_count: Array.isArray(row.hotspots) ? row.hotspots.length : 0,
  }));
}

/**
 * 按 id 精确读取一条快照。
 * @param {number} id
 */
export async function fetchHotspotById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`快照读取失败：${error.message}`);
  return data;
}

/**
 * 把用户的选择回写到 writing_sessions.hotspot_ref。
 *
 * @param {string} dbSessionId writing_sessions 主键（UUID）
 * @param {object} ref         见下方字段说明
 */
export async function saveHotspotRef(dbSessionId, ref) {
  if (!dbSessionId) throw new Error("saveHotspotRef: dbSessionId 不能为空");

  const payload = {
    hotspot_result_id: ref.hotspotResultId,
    hotspot_index: ref.hotspotIndex,
    direction_index: ref.directionIndex,
    hotspot_title: ref.hotspotTitle,
    platform: ref.platform,
    selected_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("writing_sessions")
    .update({ hotspot_ref: payload, updated_at: new Date().toISOString() })
    .eq("session_id", dbSessionId)
    .select()
    .single();

  if (error) throw new Error(`热点引用写入失败：${error.message}`);
  return data;
}
