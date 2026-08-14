/**
 * ═══════════════════════════════════════════════════════════════════
 * AI 服务抽象层（AIService）
 * ═══════════════════════════════════════════════════════════════════
 *
 * 本项目原始版本使用美团内部 CatX Agent API。
 * 开源版本将 AI 调用抽象为统一接口，支持多种后端：
 *
 *   - "catx"    → 原始 CatX Agent（需美团内网）
 *   - "openai"  → OpenAI 兼容 API（GPT-4o / DeepSeek 等）
 *   - "custom"  → 用户自定义适配器
 *
 * 接入新后端只需实现 AIService 接口，并在 factory 中注册即可。
 */

// ── 类型定义 ────────────────────────────────────────────────

export interface ToneArcVocab {
  tones: string[];
  arcs: string[];
  strongPairs: Array<{ tone: string; skeleton: string; strength: string }>;
  allPairs: Array<{ tone: string; skeleton: string; strength: string }>;
}

export interface ScanOptions {
  topN?: number;
  directionsPerHotspot?: number;
}

export interface HotspotDirection {
  hook: string;
  angle?: string;
  tone?: string;
  skeleton?: string;
  synopsis?: string;
  type?: string;
  transform?: string;
}

export interface HotspotResult {
  title: string;
  heat?: string;
  heat_numeric?: number;
  platform?: string;
  platforms?: string[];
  resonance?: boolean;
  event_core?: string;
  fingerprint?: string[];
  emotion_entry?: string;
  relation_tension?: string;
  emotion_nail?: string;
  controversy_gap?: string;
  directions?: HotspotDirection[];
}

export interface AIService {
  /**
   * 执行热榜扫描，返回结构化热点数据
   */
  scanHotspots(vocab: ToneArcVocab, options: ScanOptions): Promise<{
    response: string;
    hotspots: HotspotResult[];
  }>;

  /**
   * 生成针对某个热点的创作方向
   */
  generateDirections(hotspot: HotspotResult, vocab: ToneArcVocab): Promise<HotspotDirection[]>;

  /**
   * 发送自定义 prompt（通用能力）
   */
  sendMessage(prompt: string): Promise<string>;
}

// ── CatX Adapter（原始实现） ────────────────────────────────

class CatXService implements AIService {
  private baseUrl: string;
  private agentId: string;
  private envId: string;
  private apiKey: string;
  private proxy: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_CATX_BASE_URL || '';
    this.agentId = import.meta.env.VITE_CATX_AGENT_ID || '';
    this.envId = import.meta.env.VITE_CATX_ENV_ID || '';
    this.apiKey = import.meta.env.VITE_CATX_API_KEY || '';
    this.proxy = import.meta.env.VITE_CATX_PROXY || '';
  }

  async scanHotspots(vocab: ToneArcVocab, options: ScanOptions) {
    // 动态导入避免打包无用代码
    const { startHotspotAgentFlow } = await import('./catx-client');
    const { buildHotlistScanPrompt } = await import('./hotspot-prompt');
    const prompt = buildHotlistScanPrompt(vocab, options);
    return startHotspotAgentFlow(prompt, 600000);
  }

  async generateDirections(hotspot: HotspotResult, vocab: ToneArcVocab) {
    const { sendHotspotMessage, pollHotspotResponse } = await import('./catx-client');
    const { buildCandidateFromDirectionPrompt } = await import('./hotspot-prompt');
    const prompt = buildCandidateFromDirectionPrompt(hotspot, vocab);
    const sessionId = await sendHotspotMessage(prompt);
    return pollHotspotResponse(sessionId, 120000);
  }

  async sendMessage(prompt: string) {
    const { sendHotspotMessage, pollHotspotResponse } = await import('./catx-client');
    const sessionId = await sendHotspotMessage(prompt);
    return pollHotspotResponse(sessionId, 120000);
  }
}

// ── OpenAI 兼容 Adapter ────────────────────────────────────

class OpenAIService implements AIService {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    this.model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o';
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async scanHotspots(vocab: ToneArcVocab, options: ScanOptions) {
    const systemPrompt = `你是一个热点内容分析专家。请分析以下热榜数据，提取适合改编为短篇小说的热点事件。
基调词表：${vocab.tones.join('、')}
叙事弧词表：${vocab.arcs.join('、')}
请按照 JSON 格式返回，包含 title、heat、event_core、directions 等字段。`;
    const userPrompt = `请扫描热榜并返回 ${options.topN || 15} 条热点，每条 ${options.directionsPerHotspot || 4} 个创作方向。`;
    const response = await this.callOpenAI(systemPrompt, userPrompt);
    return { response, hotspots: this.parseResponse(response) };
  }

  async generateDirections(hotspot: HotspotResult, vocab: ToneArcVocab) {
    const systemPrompt = `你是创作方向生成专家。基调词表：${vocab.tones.join('、')}。叙事弧词表：${vocab.arcs.join('、')}。`;
    const userPrompt = `为热点「${hotspot.title}」生成 4 个创作方向。事件核心：${hotspot.event_core}`;
    const response = await this.callOpenAI(systemPrompt, userPrompt);
    return this.parseDirections(response);
  }

  async sendMessage(prompt: string) {
    return this.callOpenAI('你是一个有帮助的助手。', prompt);
  }

  private parseResponse(response: string): HotspotResult[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return [];
    } catch {
      return [];
    }
  }

  private parseDirections(response: string): HotspotDirection[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return [];
    } catch {
      return [];
    }
  }
}

// ── Custom Adapter（占位符，用户可替换） ────────────────────

class CustomService implements AIService {
  async scanHotspots(_vocab: ToneArcVocab, _options: ScanOptions) {
    throw new Error('Custom AIService not implemented. Please provide your own implementation.');
  }
  async generateDirections(_hotspot: HotspotResult, _vocab: ToneArcVocab) {
    throw new Error('Custom AIService not implemented. Please provide your own implementation.');
  }
  async sendMessage(_prompt: string) {
    throw new Error('Custom AIService not implemented. Please provide your own implementation.');
  }
}

// ── Factory ────────────────────────────────────────────────

let _instance: AIService | null = null;

export function getAIService(): AIService {
  if (_instance) return _instance;

  const provider = import.meta.env.VITE_AI_PROVIDER || 'custom';
  switch (provider) {
    case 'catx':
      _instance = new CatXService();
      break;
    case 'openai':
      _instance = new OpenAIService();
      break;
    default:
      _instance = new CustomService();
  }
  return _instance;
}

/** 允许运行时替换 AI 服务（用于测试或自定义接入） */
export function setAIService(service: AIService) {
  _instance = service;
}
