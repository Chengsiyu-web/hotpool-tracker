import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Flame, Check, Loader2, ArrowRight, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { getAIService } from "../lib/ai-service";
import { fetchToneArcVocab, auditHotspotsVocab } from "../lib/tone-arc-vocab";
import { fetchLatestHotspots, fetchTodayCronResult, todayLocal } from "../lib/hotspot-store";
import { processScanResults } from "@/lib/hotpool";
import { useHotPool } from "@/hooks/useHotPool";
import HotPoolBar from "@/components/HotPoolBar";
import { normalizeTitle } from "@/lib/hotpool";

// 方向颜色映射
const DIRECTION_COLORS: Record<string, string> = {
  '家庭伦理复仇': 'bg-rose-50 text-rose-700 border-rose-100',
  '奇幻志怪虐恋': 'bg-violet-50 text-violet-700 border-violet-100',
  '民俗恐怖复仇': 'bg-stone-100 text-stone-700 border-stone-200',
  '都市悬疑惊悚': 'bg-slate-50 text-slate-700 border-slate-200',
  '甜宠追妻火葬场': 'bg-pink-50 text-pink-700 border-pink-100',
  '穿书女配逆袭': 'bg-amber-50 text-amber-700 border-amber-100',
  '贴身视角短句驱动': 'bg-teal-50 text-teal-700 border-teal-100',
  '社会议题阶层冲突': 'bg-stone-100 text-stone-700 border-stone-200',
  'default': 'bg-orange-50 text-orange-700 border-orange-100',
};

const getDirectionColor = (type: string) => DIRECTION_COLORS[type] || DIRECTION_COLORS.default;

// 平台颜色映射
const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  微博: { bg: "bg-red-50", text: "text-red-600" },
  知乎: { bg: "bg-blue-50", text: "text-blue-600" },
  头条: { bg: "bg-amber-50", text: "text-amber-600" },
  抖音: { bg: "bg-purple-50", text: "text-purple-600" },
};

// 占位符检测黑名单
const PLACEHOLDER_PATTERNS = [
  /^热点\d+标题$/,
  /^一句话钩子$/,
  /^切入角度描述$/,
  /^故事梗概描述$/,
  /^事件核心描述$/,
  /^关键词\d*$/,
];

function isPlaceholder(text: string): boolean {
  if (!text) return true;
  return PLACEHOLDER_PATTERNS.some(p => p.test(text.trim()));
}

function validateScanResult(latest: any): { ok: boolean; issues: string[]; validHotspots: any[] } {
  const issues: string[] = [];
  if (!latest) return { ok: false, issues: ['数据为空'], validHotspots: [] };

  const hotspots = Array.isArray(latest.hotspots) ? latest.hotspots : [];
  if (hotspots.length === 0) {
    return { ok: false, issues: ['热点列表为空'], validHotspots: [] };
  }

  const validHotspots: any[] = [];

  hotspots.forEach((h: any, idx: number) => {
    const isTitlePlaceholder = isPlaceholder(h.title);
    const isEventCorePlaceholder = isPlaceholder(h.event_core);

    if (isTitlePlaceholder || isEventCorePlaceholder) {
      issues.push(`热点#${idx + 1}是占位符数据（title="${h.title}"）`);
      return;
    }

    if (!Array.isArray(h.directions) || h.directions.length === 0) {
      issues.push(`热点#${idx + 1}缺少 directions`);
      validHotspots.push(h);
      return;
    }

    let dirHasPlaceholder = false;
    h.directions.forEach((d: any, dIdx: number) => {
      if (isPlaceholder(d.hook)) {
        issues.push(`热点#${idx + 1}方向#${dIdx + 1}的 hook 是占位符`);
        dirHasPlaceholder = true;
      }
      if (isPlaceholder(d.synopsis)) {
        issues.push(`热点#${idx + 1}方向#${dIdx + 1}的 synopsis 是占位符`);
        dirHasPlaceholder = true;
      }
    });

    if (!dirHasPlaceholder) {
      validHotspots.push(h);
    }
  });

  return { ok: issues.length === 0, issues, validHotspots };
}

interface HotspotScanPageProps {
  onNext?: (data: any) => void;
}

export default function HotspotScanPage({ onNext }: HotspotScanPageProps) {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [vocabAudit, setVocabAudit] = useState<any>(null);
  const [selectedDirections, setSelectedDirections] = useState<Set<string>>(new Set());
  const [expandedHotspots, setExpandedHotspots] = useState<Set<number>>(new Set());
  const [poolAdded, setPoolAdded] = useState<Set<string>>(new Set());
  const [poolAdding, setPoolAdding] = useState<Set<string>>(new Set());
  const { activePool, coolingPool, isLoading: poolLoading, refreshPool } = useHotPool();

  const hotspots: any[] = Array.isArray(snapshot?.hotspots) ? snapshot.hotspots : [];
  const isStale = snapshot && snapshot.scan_date !== todayLocal();

  const runScan = useCallback(async (source: string) => {
    setLoading(true);
    setError("");
    setProgressNote("正在准备知识库词表…");
    const startedAt = Date.now();
    try {
      const vocab = await fetchToneArcVocab(true);
      if (!vocab || !vocab.tones?.length || !vocab.arcs?.length) {
        console.warn('[runScan] 词表拉取异常，将使用空词表继续');
        setProgressNote("⚠️ 知识库词表拉取异常，本次扫描的基调/叙事弧命名可能不准确。继续执行中...");
      }
      setProgressNote("Agent 正在联网抓取四大平台热榜并写入数据库，这一步通常需要 5-10 分钟，请耐心等待…");

      const aiService = getAIService();
      const topN = Number(import.meta.env.VITE_SCAN_TOP_N) || 15;
      const directionsPerHotspot = Number(import.meta.env.VITE_DIRECTIONS_PER_HOTSPOT) || 4;
      const { hotspots: scannedHotspots, response } = await aiService.scanHotspots(vocab, { topN, directionsPerHotspot });

      // 写入 hotspot_results 表
      const { supabase } = await import("@/integrations/supabase/client");
      const { error: insertError } = await supabase.from("hotspot_results").insert({
        source: source === "manual" ? "manual" : "cron",
        scan_date: todayLocal(),
        status: "success",
        hotspots: scannedHotspots,
        raw_response: response,
      });

      if (insertError) throw new Error(`写库失败：${insertError.message}`);

      const latest = await fetchLatestHotspots();
      const writtenAt = latest ? new Date((latest as any).created_at).getTime() : 0;
      if (!latest || writtenAt < startedAt) {
        throw new Error("Agent 已完成扫描，但未在数据库中查到本次新写入的记录，请稍后点击刷新重试");
      }

      const validation = validateScanResult(latest);
      if (validation.validHotspots.length === 0) {
        throw new Error(`扫描结果全部为占位符或空数据：${validation.issues.slice(0, 3).join('、')}`);
      }

      const filteredLatest = { ...latest, hotspots: validation.validHotspots };
      if (validation.issues.length > 0) {
        const filteredCount = (Array.isArray((latest as any).hotspots) ? (latest as any).hotspots : []).length - validation.validHotspots.length;
        setProgressNote(`⚠️ 本次扫描过滤了 ${filteredCount} 条占位符/残缺数据，展示 ${validation.validHotspots.length} 条有效热点。`);
      }

      const list = validation.validHotspots;
      if (list.length > 0) {
        const audit = auditHotspotsVocab(list, vocab);
        setVocabAudit(audit);
      }

      setSnapshot(filteredLatest);
      setProgressNote("");
    } catch (err: any) {
      console.error("[runScan] 扫描异常:", err);
      setError(err.message || "热点扫描失败");
      setProgressNote("");
    } finally {
      setLoading(false);
    }
  }, []);

  // 首屏：只读取历史数据，不自动触发扫描
  useEffect(() => {
    (async () => {
      try {
        const today = await fetchTodayCronResult();
        if (today) {
          setSnapshot(today);
          setBootLoading(false);
          return;
        }
        const latest = await fetchLatestHotspots();
        if (latest) setSnapshot(latest);
        setBootLoading(false);
      } catch (err: any) {
        setError(err.message || "热点数据读取失败");
        setBootLoading(false);
      }
    })();
  }, []);

  const toggleDirection = (hotspotIndex: number, directionIndex: number) => {
    const key = `${hotspotIndex}-${directionIndex}`;
    const newSelected = new Set(selectedDirections);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedDirections(newSelected);
  };

  const toggleHotspotExpand = (hotspotIndex: number) => {
    const newExpanded = new Set(expandedHotspots);
    if (newExpanded.has(hotspotIndex)) {
      newExpanded.delete(hotspotIndex);
    } else {
      newExpanded.add(hotspotIndex);
    }
    setExpandedHotspots(newExpanded);
  };

  const handleAddToPool = async (hotspot: any) => {
    const key = normalizeTitle(hotspot.title || hotspot.name || "");
    if (!key) return;
    if (poolAdded.has(key) || poolAdding.has(key)) return;

    setPoolAdding(prev => new Set(prev).add(key));
    try {
      await processScanResults([hotspot]);
      setPoolAdded(prev => new Set(prev).add(key));
      await refreshPool();
    } catch (e) {
      console.error('[handleAddToPool] 加入追踪池失败', e);
      setError(`加入追踪池失败：${(e as Error).message}`);
    } finally {
      setPoolAdding(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  const handleConfirm = () => {
    if (selectedDirections.size === 0) return;
    const firstKey = Array.from(selectedDirections)[0];
    const [hIdx, dIdx] = firstKey.split('-').map(Number);
    const hotspot = hotspots[hIdx];
    const direction = hotspot?.directions?.[dIdx];

    if (!hotspot || !direction) {
      setError('选中方向的数据异常，请重新选择');
      return;
    }

    const safeDirection = {
      ...direction,
      hook: direction.hook || '',
      angle: direction.angle || '',
      tone: direction.tone || direction.type || '',
      skeleton: direction.skeleton || '',
      synopsis: direction.synopsis || '',
      type: direction.type || direction.tone || '',
      transform: direction.transform || '',
    };

    onNext && onNext({
      hotspot,
      hotspotIndex: hIdx,
      hotspotResultId: snapshot?.id,
      direction: safeDirection,
      directionIndex: dIdx,
    });
  };

  return (
    <div className="min-h-full bg-[#f6f4f0]">
      <HotPoolBar activePool={activePool} coolingPool={coolingPool} isLoading={poolLoading} refreshPool={refreshPool} />
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* 标题区域 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-medium text-stone-800">今日热点</h2>
            <p className="text-sm text-stone-400 mt-1">
              每天自动扫描微博 / 知乎 / 头条 / 抖音热榜，筛出适合改编的选题
            </p>
          </div>
          <div className="flex items-center gap-3">
            {snapshot && !loading && (
              <span className="hidden sm:flex text-sm text-stone-400">
                {isStale ? `数据来自 ${snapshot.scan_date}` : `更新于 ${formatWhen(snapshot.created_at)}`}
              </span>
            )}
            <button
              onClick={() => runScan("manual")}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-stone-800 text-white text-base hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {loading ? "扫描中" : "刷新"}
            </button>
          </div>
        </div>

        {/* 状态提示 */}
        {(loading || bootLoading) && (
          <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6 flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
            <div>
              <p className="text-base text-stone-600">{bootLoading ? "正在读取今日热点…" : "Agent 正在扫描热榜"}</p>
              <p className="text-sm text-stone-400 mt-0.5">{progressNote || "请稍候"}</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="bg-rose-50 rounded-2xl border border-rose-200 p-4 mb-6">
            <p className="text-base text-rose-600">{error}</p>
            {hotspots.length > 0 && (
              <p className="text-sm text-rose-400 mt-1">下方展示的是上一次成功扫描的结果。</p>
            )}
          </div>
        )}

        {/* 词表审计提示 */}
        {vocabAudit && vocabAudit.invalid > 0 && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 mb-6">
            <p className="text-base text-amber-700">
              {vocabAudit.invalid}/{vocabAudit.total} 个创作方向的基调或叙事弧不在知识库词表内
            </p>
          </div>
        )}

        {/* 热点卡片 */}
        {hotspots.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {hotspots.map((hotspot, hIdx) => (
              <HotspotCard
                key={hIdx}
                hotspot={hotspot}
                hotspotIndex={hIdx}
                isExpanded={expandedHotspots.has(hIdx)}
                onToggleExpand={() => toggleHotspotExpand(hIdx)}
                selectedDirections={selectedDirections}
                onToggleDirection={toggleDirection}
                poolAdded={poolAdded.has(normalizeTitle(hotspot.title || hotspot.name || ""))}
                poolAdding={poolAdding.has(normalizeTitle(hotspot.title || hotspot.name || ""))}
                onAddToPool={() => handleAddToPool(hotspot)}
              />
            ))}
          </div>
        )}

        {/* 空状态 */}
        {!loading && !bootLoading && hotspots.length === 0 && !error && (
          <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center">
            <Flame className="w-8 h-8 text-stone-300 mx-auto mb-3" />
            <p className="text-base text-stone-500 mb-1">还没有热点数据</p>
            <p className="text-sm text-stone-400 mb-4">点击下方按钮发起今天的第一次扫描</p>
            <button
              onClick={() => runScan("manual")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-800 text-white text-base hover:bg-stone-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              立即扫描热榜
            </button>
          </div>
        )}

        {/* 底部确认按钮 */}
        {selectedDirections.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-teal-600 text-white text-sm font-medium shadow-lg hover:bg-teal-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span className="text-base">已选 {selectedDirections.size} 个方向，去创作</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 热点卡片
function HotspotCard({ 
  hotspot, 
  hotspotIndex,
  isExpanded,
  onToggleExpand,
  selectedDirections, 
  onToggleDirection,
  poolAdded,
  poolAdding,
  onAddToPool
}: { 
  hotspot: any; 
  hotspotIndex: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  selectedDirections: Set<string>;
  onToggleDirection: (hIdx: number, dIdx: number) => void;
  poolAdded: boolean;
  poolAdding: boolean;
  onAddToPool: () => void;
}) {
  const [directionsExpanded, setDirectionsExpanded] = useState(false);

  const { 
    title, 
    platform,
    platforms,
    heat, 
    resonance,
    event_core, 
    fingerprint,
    emotion_entry,
    relation_tension,
    emotion_nail,
    controversy_gap,
    directions 
  } = hotspot;

  const primaryPlatform = platform || (platforms && platforms.length > 0 ? platforms[0] : "");
  const ps = PLATFORM_COLORS[primaryPlatform] || { bg: "bg-stone-100", text: "text-stone-600" };
  const selectedCount = directions?.filter((_: any, dIdx: number) => 
    selectedDirections.has(`${hotspotIndex}-${dIdx}`)
  ).length || 0;

  const hasEmotion = emotion_entry || relation_tension || emotion_nail || controversy_gap;
  const hasDirections = directions && directions.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-base font-medium text-stone-800 leading-snug line-clamp-2">{title}</h3>
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            {resonance && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 whitespace-nowrap">
                多平台
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onAddToPool(); }}
              disabled={poolAdded || poolAdding}
              className={`text-[11px] px-2 py-0.5 rounded-full flex items-center gap-0.5 whitespace-nowrap transition-colors ${
                poolAdded
                  ? "bg-teal-50 text-teal-600 cursor-default"
                  : poolAdding
                  ? "bg-stone-100 text-stone-400 cursor-wait"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200 cursor-pointer"
              }`}
            >
              {poolAdding ? (
                <><Loader2 className="w-2.5 h-2.5 animate-spin" /> 加入中</>
              ) : poolAdded ? (
                <><Check className="w-2.5 h-2.5" /> 已追踪</>
              ) : (
                <><Plus className="w-2.5 h-2.5" /> 加入追踪池</>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-2">
          {primaryPlatform && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${ps.bg} ${ps.text}`}>
              {primaryPlatform}
            </span>
          )}
          {platforms && platforms.length > 1 && (
            <span className="text-xs text-stone-400">+{platforms.length - 1}</span>
          )}
          {heat && heat !== "—" && (
            <span className="flex items-center gap-0.5 text-xs text-stone-400">
              <Flame className="w-3 h-3" />
              {heat}
            </span>
          )}
        </div>

        {event_core && (
          <p className="text-sm text-stone-600 leading-relaxed line-clamp-3">{event_core}</p>
        )}

        {fingerprint && fingerprint.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {fingerprint.slice(0, 3).map((f: string, i: number) => (
              <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {(hasEmotion || hasDirections) && (
        <div className="border-t border-stone-100/70">
          {hasEmotion && (
            <>
              <button
                onClick={onToggleExpand}
                className="w-full flex items-center justify-between px-4 py-2 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  情绪拆解
                  <span className="text-stone-400">{[emotion_entry, relation_tension, emotion_nail, controversy_gap].filter(Boolean).length} 项</span>
                </span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {isExpanded && (
                <div className="px-4 py-2.5 bg-stone-50/70 border-t border-stone-100/70">
                  <div className="grid grid-cols-1 gap-2">
                    {emotion_entry && <MetaCell label="情绪入口" value={emotion_entry} />}
                    {relation_tension && <MetaCell label="关系张力" value={relation_tension} />}
                    {emotion_nail && <MetaCell label="情绪钉子" value={emotion_nail} />}
                    {controversy_gap && <MetaCell label="争议裂缝" value={controversy_gap} />}
                  </div>
                </div>
              )}
            </>
          )}

          {hasDirections && (
            <>
              {hasEmotion && <div className="border-t border-stone-100/70" />}
              <button
                onClick={() => setDirectionsExpanded(!directionsExpanded)}
                className="w-full flex items-center justify-between px-4 py-2 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  创作方向
                  <span className="text-stone-400">{directions.length} 个</span>
                  {selectedCount > 0 && (
                    <span className="text-teal-600">· 已选 {selectedCount}</span>
                  )}
                </span>
                {directionsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {directionsExpanded && (
                <div className="px-4 py-2.5 border-t border-stone-100/70 space-y-1.5">
                  {directions.map((direction: any, dIdx: number) => {
                    const key = `${hotspotIndex}-${dIdx}`;
                    const isSelected = selectedDirections.has(key);
                    return (
                      <DirectionCard
                        key={dIdx}
                        direction={direction}
                        isSelected={isSelected}
                        onToggle={() => onToggleDirection(hotspotIndex, dIdx)}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// 方向卡片
function DirectionCard({ 
  direction, 
  isSelected, 
  onToggle 
}: { 
  direction: any; 
  isSelected: boolean; 
  onToggle: () => void;
}) {
  const toneValue = direction.tone || direction.type;
  const { hook, synopsis, angle, skeleton, transform } = direction;

  return (
    <div
      onClick={onToggle}
      className={`p-2.5 rounded-xl cursor-pointer transition-all ${
        isSelected
          ? "ring-2 ring-teal-300 bg-teal-50/60"
          : "shadow-sm bg-stone-50/40 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected ? "bg-teal-500 border-teal-500" : "border-stone-300"
          }`}
        >
          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded border ${getDirectionColor(toneValue)}`}>
              {toneValue}
            </span>
            {skeleton && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                {skeleton}
              </span>
            )}
            {transform && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-100">
                {transform}
              </span>
            )}
          </div>

          <p className="text-sm font-medium text-stone-700 mb-1">{hook}</p>

          {angle && (
            <p className="text-sm text-stone-500 mb-1">
              <span className="text-stone-400">切入：</span>
              {angle}
            </p>
          )}

          {synopsis && (
            <p className="text-sm text-stone-500 leading-relaxed">{synopsis}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// 元信息单元格
function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-2.5 py-2 shadow-sm bg-white">
      <div className="text-xs text-stone-400 mb-0.5 uppercase tracking-wide">{label}</div>
      <div className="text-sm text-stone-600 leading-relaxed">{value}</div>
    </div>
  );
}

// 辅助函数
function formatWhen(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`;
}
