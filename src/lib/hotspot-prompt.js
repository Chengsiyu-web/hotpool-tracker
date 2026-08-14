/**
 * ═══════════════════════════════════════════════════════════════════
 * 热点扫描提示词（发送给 AI Agent）
 * ═══════════════════════════════════════════════════════════════════
 *
 * 本模块包含所有发送给 AI Agent 的 prompt：
 * - buildHotlistScanPrompt: 主扫榜提示词
 * - buildCandidateFromDirectionPrompt: 从方向生成完整候选
 * - buildDirectInputPrompt: 直接输入模式
 *
 * 【依赖说明】
 * 原始项目依赖以下外部资源：
 * 1. hotflashnews.com —— 四大平台热榜聚合站点（prompt 中引用为数据源）
 * 2. kb_tone_skeleton_mapping 表 —— 基调/叙事弧词表（由 tone-arc-vocab.js 动态获取）
 * 3. CatX Agent API —— 美团内部 AI Agent 服务
 *
 * 开源版本已将这些依赖抽象为可替换接口（参见 ai-service.ts），
 * 用户可接入任意 OpenAI 兼容服务。
 */

/**
 * 构建主扫榜提示词
 * @param {object} vocab 词表（tones, arcs, strongPairs）
 * @param {object} options 配置项
 * @param {number} options.topN 取多少条热点
 * @param {number} options.directionsPerHotspot 每条热点生成几个方向
 * @returns {string} 完整的 prompt 文本
 */
export function buildHotlistScanPrompt(vocab, options = {}) {
  const topN = options.topN || 15;
  const directionsPerHotspot = options.directionsPerHotspot || 4;

  const vocabBlock = buildVocabBlock(vocab);

  return `你是一个专业的网文选题策划编辑。请执行一次完整的热榜扫描与选题分析流程。

## 第一步：抓取热榜数据

请联网抓取以下四个平台的今日热榜数据：
- 微博热搜
- 知乎热榜
- 今日头条热榜
- 抖音热点榜

可参考 hotflashnews.com 等聚合站点获取数据。

## 第二步：筛选适合改编的热点

从抓取到的全部热点中，筛选出 ${topN} 条最适合改编为短篇小说的热点。

筛选标准：
1. 有明确的人物冲突或事件反转
2. 能引发读者情绪共鸣（愤怒、爽感、好奇、同情）
3. 有讨论度和话题性
4. 不是纯时政/敏感话题

## 第三步：为每个热点生成 ${directionsPerHotspot} 个创作方向

每个方向需包含：
- hook: 一句话钩子（吸引读者的开篇噱头）
- angle: 切入角度描述
- tone: 基调（必须从下方词表选择）
- skeleton: 叙事弧（必须从下方词表选择）
- synopsis: 故事梗概描述

${vocabBlock}

## 第四步：情绪拆解

每个热点补充以下情绪维度：
- emotion_entry: 情绪入口（读者为什么会点进来）
- relation_tension: 关系张力（人物之间最核心的冲突）
- emotion_nail: 情绪钉子（让读者记住的那个瞬间）
- controversy_gap: 争议裂缝（不同立场读者的分歧点）

## 输出格式

请以严格的 JSON 数组格式输出，每个热点一个对象：

\`\`\`json
[
  {
    "title": "热点标题",
    "heat": "1234万",
    "platform": "微博",
    "platforms": ["微博", "知乎"],
    "resonance": true,
    "event_core": "一句话事实基线",
    "fingerprint": ["标签1", "标签2", "标签3"],
    "emotion_entry": "...",
    "relation_tension": "...",
    "emotion_nail": "...",
    "controversy_gap": "...",
    "directions": [
      {
        "hook": "一句话钩子",
        "angle": "切入角度",
        "tone": "基调名称",
        "skeleton": "叙事弧名称",
        "synopsis": "故事梗概"
      }
    ]
  }
]
\`\`\`

注意：tone 和 skeleton 必须严格使用词表中的名称，不得改写或自造。`;
}

/**
 * 从已有方向生成完整候选的提示词
 */
export function buildCandidateFromDirectionPrompt(hotspot, vocab) {
  const vocabBlock = buildVocabBlock(vocab);
  return `基于以下热点和方向，生成完整的创作候选方案。

热点：${hotspot.title}
事件核心：${hotspot.event_core}

${vocabBlock}

请生成完整方案。`;
}

/**
 * 直接输入模式的提示词
 */
export function buildDirectInputPrompt(title, eventCore, vocab) {
  const vocabBlock = buildVocabBlock(vocab);
  return `用户手动输入了一个热点，请分析并生成创作方向。

标题：${title}
事件核心：${eventCore}

${vocabBlock}

请为该热点生成 4 个创作方向。`;
}

/**
 * 候选对象 Schema 提示（供 Agent 理解结构）
 */
export const CANDIDATE_SCHEMA_HINT = `
候选对象应包含以下字段：
- title: 热点标题
- event_core: 事件核心（一句话事实）
- directions: 创作方向数组
  - hook: 一句话钩子
  - angle: 切入角度
  - tone: 基调
  - skeleton: 叙事弧
  - synopsis: 故事梗概
`;

// ── 内部辅助函数 ──────────────────────────────────────────

function buildVocabBlock(vocab) {
  if (!vocab) return '';

  const toneList = vocab.tones?.length
    ? vocab.tones.map(t => `- ${t}`).join('\n')
    : '- （词表未加载）';

  const arcList = vocab.arcs?.length
    ? vocab.arcs.map(a => `- ${a}`).join('\n')
    : '- （词表未加载）';

  const strongLines = vocab.strongPairs?.length
    ? vocab.strongPairs.map(p => `- ${p.tone} → ${p.skeleton}`).join('\n')
    : '- （无）';

  return `## 词表约束

### 基调词表（tone 字段必须从下列名称中选择）：
${toneList}

### 叙事弧词表（skeleton 字段必须从下列名称中选择）：
${arcList}

### 强共现组合（优先使用）：
${strongLines}`;
}
