import { supabase } from "@/integrations/supabase/client";

/**
 * ═══════════════════════════════════════════════════════════════════
 * 基调 / 叙事弧词表（唯一权威来源：kb_tone_skeleton_mapping 表）
 * ═══════════════════════════════════════════════════════════════════
 *
 * 本模块承担两件事：
 *   1. fetchToneArcVocab()      —— 实时拉取词表，供提示词动态拼装
 *   2. validateCandidateVocab() —— 交棒前做白名单硬校验，拦住非法命名
 *
 * 词表随知识库增删自动生效，不需要改代码。
 */

let _vocabCache = null;

/**
 * 拉取基调 / 叙事弧词表及共现强度数据。
 */
export async function fetchToneArcVocab(force = false) {
  if (_vocabCache && !force) return _vocabCache;

  const { data, error } = await supabase
    .from("kb_tone_skeleton_mapping")
    .select("tone, skeleton, strength, shared_books_count");

  if (error) {
    throw new Error(`基调/叙事弧词表拉取失败：${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error("基调/叙事弧词表为空，请检查 kb_tone_skeleton_mapping 表数据");
  }

  const tones = [...new Set(data.map((r) => r.tone).filter(Boolean))];
  const arcs = [...new Set(data.map((r) => r.skeleton).filter(Boolean))];
  const strongPairs = data.filter((r) => r.strength === "strong");

  _vocabCache = { tones, arcs, strongPairs, allPairs: data };
  return _vocabCache;
}

/**
 * 把词表渲染成可直接嵌进提示词的文本块。
 */
export function buildVocabPromptBlock(vocab) {
  const { tones, arcs, strongPairs } = vocab;

  const strongByTone = {};
  for (const p of strongPairs) {
    if (!strongByTone[p.tone]) strongByTone[p.tone] = [];
    strongByTone[p.tone].push(p.skeleton);
  }
  const strongLines = Object.entries(strongByTone)
    .map(([tone, sks]) => `- ${tone} → ${sks.join(" / ")}`)
    .join("\n");

  return `【基调词表】以下 ${tones.length} 个名称来自知识库 kb_tone_skeleton_mapping 表，是唯一合法取值。
tone 字段必须逐字使用下列名称之一，禁止改写、简写、加减后缀或自造名称：
${tones.map((t) => `- ${t}`).join("\n")}

【叙事弧词表】以下 ${arcs.length} 个名称同样来自 kb_tone_skeleton_mapping 表，是唯一合法取值。
skeleton 字段必须逐字使用下列名称之一：
${arcs.map((a) => `- ${a}`).join("\n")}

【共现强度 strong 的推荐组合】优先从下列搭配中选择，这些是知识库中被真实作品验证过的高共现组合：
${strongLines}

【基调选择原则】
先判断事件的核心矛盾类型（职场/阶层？情感/婚恋？家庭/伦理？案件/悬疑？民俗/禁忌？身份/穿越？超自然/志怪？），
再据此从上表锁定最贴合的基调。注意：职场、阶层固化、公平争议、底层逆袭这类社会议题型冲突，
其情绪内核是"被压迫—反抗—清算"，应优先考虑家庭伦理复仇基调或都市悬疑惊悚基调配合
"压迫升级+反杀清算弧"来承载，不要因为标题里出现"追""复合""前任"等字眼就误选甜宠类基调。`;
}

/**
 * 白名单硬校验：candidate 的 tone_name / arc_name 必须落在词表内。
 */
export function validateCandidateVocab(candidate, vocab) {
  const errors = [];
  if (!candidate) {
    return { valid: false, errors: ["candidate 为空"] };
  }
  if (!candidate.tone_name) {
    errors.push("缺少 tone_name 字段");
  } else if (!vocab.tones.includes(candidate.tone_name)) {
    errors.push(`基调「${candidate.tone_name}」不在知识库词表内`);
  }
  if (!candidate.arc_name) {
    errors.push("缺少 arc_name 字段");
  } else if (!vocab.arcs.includes(candidate.arc_name)) {
    errors.push(`叙事弧「${candidate.arc_name}」不在知识库词表内`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 对单个创作方向做同样的词表校验（方向层面用 tone / skeleton 两个字段名）。
 */
export function validateDirectionVocab(direction, vocab) {
  const errors = [];
  if (!direction) return { valid: false, errors: ["direction 为空"] };
  if (direction.tone && !vocab.tones.includes(direction.tone)) {
    errors.push(`基调「${direction.tone}」不在词表内`);
  }
  if (direction.skeleton && !vocab.arcs.includes(direction.skeleton)) {
    errors.push(`叙事弧「${direction.skeleton}」不在词表内`);
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 批量统计一次扫榜结果里有多少方向的命名不合法，用于页面提示与质量观测。
 */
export function auditHotspotsVocab(hotspots, vocab) {
  let total = 0;
  let invalid = 0;
  const samples = [];
  for (const h of hotspots || []) {
    for (const d of h.directions || []) {
      total++;
      const { valid, errors } = validateDirectionVocab(d, vocab);
      if (!valid) {
        invalid++;
        if (samples.length < 5) samples.push(`${h.title?.slice(0, 12)}…：${errors.join("；")}`);
      }
    }
  }
  return { total, invalid, samples };
}
