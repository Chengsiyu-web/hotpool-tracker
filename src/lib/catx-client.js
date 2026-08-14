/**
 * ═══════════════════════════════════════════════════════════════════
 * CatX Agent 客户端（原始美团内部实现）
 * ═══════════════════════════════════════════════════════════════════
 *
 * 本文件保留作为参考实现，供接入美团 CatX Agent 的用户使用。
 * 开源默认版本使用 ai-service.ts 中的抽象接口，不直接依赖本文件。
 *
 * 如需使用 CatX 后端：
 * 1. 在 .env 中设置 VITE_AI_PROVIDER=catx
 * 2. 填写 CatX 相关配置
 * 3. ai-service.ts 的 CatXService 会自动加载本文件
 */

import { supabase, SUPABASE_ANON_KEY_EXPORT as SUPABASE_ANON_KEY } from "@/integrations/supabase/client";

const AGENT_ID = import.meta.env.VITE_CATX_AGENT_ID || "";
const ENV_ID = import.meta.env.VITE_CATX_ENV_ID || "";
const HOTSPOT_AGENT_ID = import.meta.env.VITE_CATX_AGENT_ID || AGENT_ID;
const HOTSPOT_ENV_ID = import.meta.env.VITE_CATX_ENV_ID || ENV_ID;
const HOTSPOT_API_KEY = import.meta.env.VITE_CATX_API_KEY || "";
const CATX_BASE_URL = import.meta.env.VITE_CATX_BASE_URL || "https://api.catx.sankuai.com";
const NOCODE_PROXY = import.meta.env.VITE_CATX_PROXY || "";

/**
 * 统一调用 nocode-catx-agent Edge Function（知识库创作专用）
 */
async function invokeAgent(body) {
  const { data, error } = await supabase.functions.invoke("nocode-catx-agent", { body });
  if (error) {
    console.error("CatX API request error:", error);
    throw error;
  }
  return data;
}

/** 创建会话（知识库创作 Agent） */
export async function createSession() {
  return invokeAgent({
    action: "createSession",
    agent: AGENT_ID,
    environment_id: ENV_ID,
  });
}

/** 发送用户消息事件（知识库创作 Agent） */
export async function sendMessage(sessionId, message) {
  return invokeAgent({
    action: "sendEvent",
    session_id: sessionId,
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: message }],
      },
    ],
  });
}

/** 获取会话历史事件 */
async function getSessionEvents(sessionId) {
  const { data, error } = await supabase.functions.invoke(
    `nocode-catx-agent?action=getEvents&session_id=${encodeURIComponent(sessionId)}`,
    { method: "GET" }
  );
  if (error) {
    console.error("CatX API request error:", error);
    throw error;
  }
  return Array.isArray(data) ? data : data?.events || [];
}

/* ─────────── 热点扫描：直接调用 CatX API ─────────── */

/** 通过 NoCode 代理调用 CatX API 创建会话 */
export async function createHotspotSession() {
  const res = await fetch(`${NOCODE_PROXY}?url=${encodeURIComponent(`${CATX_BASE_URL}/v1/agents/${HOTSPOT_AGENT_ID}/sessions`)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${HOTSPOT_API_KEY}`,
    },
    body: JSON.stringify({ environment_id: HOTSPOT_ENV_ID }),
  });
  if (!res.ok) throw new Error(`CatX create session failed: ${res.status}`);
  return res.json();
}

/** 发送消息到热点扫描 Agent */
export async function sendHotspotMessage(prompt) {
  const session = await createHotspotSession();
  const sessionId = session.session_id || session.id;

  const res = await fetch(`${NOCODE_PROXY}?url=${encodeURIComponent(`${CATX_BASE_URL}/v1/agents/${HOTSPOT_AGENT_ID}/sessions/${sessionId}/messages`)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${HOTSPOT_API_KEY}`,
    },
    body: JSON.stringify({
      content: [{ type: "text", text: prompt }],
      stream: true,
    }),
  });
  if (!res.ok) throw new Error(`CatX send message failed: ${res.status}`);
  return sessionId;
}

/** 轮询热点扫描结果 */
export async function pollHotspotResponse(sessionId, timeoutMs = 600000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const events = await getHotspotSessionEvents(sessionId);
      const completed = events.find((e) => e.type === "agent.message" || e.type === "session.completed");
      if (completed) {
        return completed.content || completed.text || "";
      }
    } catch (e) {
      console.warn("[pollHotspotResponse] 轮询中:", e);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("CatX polling timeout");
}

async function getHotspotSessionEvents(sessionId) {
  const res = await fetch(`${NOCODE_PROXY}?url=${encodeURIComponent(`${CATX_BASE_URL}/v1/agents/${HOTSPOT_AGENT_ID}/sessions/${sessionId}/events`)}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${HOTSPOT_API_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`CatX get events failed: ${res.status}`);
  return res.json();
}

/** 完整的热点扫描流程（创建会话 → 发送 prompt → 轮询结果） */
export async function startHotspotAgentFlow(prompt, timeoutMs = 600000) {
  const sessionId = await sendHotspotMessage(prompt);
  const response = await pollHotspotResponse(sessionId, timeoutMs);
  return { response, hotspots: [] };
}

/** 重置创作工坊会话 */
export function resetWorkshopSession() {
  // No-op in open-source version
}

/** 连接并读取热点 Agent 流式响应 */
export async function connectAndReadHotspot(prompt, onProgress) {
  return startHotspotAgentFlow(prompt);
}

/** 继续热点流程（JSON 模式） */
export async function continueHotspotFlowJson(sessionId, content) {
  return sendHotspotMessage(content);
}
