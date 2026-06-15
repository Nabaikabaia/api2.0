// ai.js - Complete AI Chat Services (Clean Response Format)

import { CONFIG } from './config.js';
import {
  randomUUID, randomId, randomString,
  parseSSE, sleep,
  sessionManager, buildHeaders, buildMobileHeaders,
  jsonResponse, errorResponse
} from './utils.js';

// ==================== ALL AVAILABLE MODELS ====================

export const AVAILABLE_MODELS = CONFIG.CHAT_MODELS;

// ==================== CHATDAY.AI (20+ MODELS) ====================

export async function chatdayChat(prompt, model, sessionId = null) {
  try {
    let session = sessionId ? sessionManager.get(sessionId) : null;
    if (!session) {
      session = {
        visitorId: randomUUID().replace(/-/g, ''),
        conversationId: randomString(8).toUpperCase() + randomString(8).toUpperCase()
      };
    }
    
    const fullModel = AVAILABLE_MODELS[model] || model;
    
    const signIn = await fetch(`${CONFIG.ENDPOINTS.CHATDAY}/api/auth/sign-in/anonymous`, {
      method: 'POST',
      headers: { 'User-Agent': CONFIG.UA_MOBILE, 'Content-Type': 'application/json' },
      body: '{}'
    });
    
    if (!signIn.ok) return { error: 'Authentication failed' };
    
    const cookie = (signIn.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
    
    const chatRes = await fetch(`${CONFIG.ENDPOINTS.CHATDAY}/api/v2/chat/anonymous`, {
      method: 'POST',
      headers: {
        'User-Agent': CONFIG.UA_MOBILE,
        'Content-Type': 'application/json',
        'Cookie': cookie,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        content: prompt,
        model: fullModel,
        visitorId: session.visitorId,
        conversationId: session.conversationId
      })
    });
    
    if (!chatRes.ok || !chatRes.body) return { error: `Chat failed: ${chatRes.status}` };
    
    let fullReply = '';
    const reader = chatRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === 'text-delta' && typeof evt.delta === 'string') {
            fullReply += evt.delta;
          }
        } catch {}
      }
    }
    
    const newSession = sessionManager.create({
      visitorId: session.visitorId,
      conversationId: session.conversationId,
      cookie
    });
    
    return {
      model: fullModel,
      result: fullReply.trim() || "No response from AI",
      session: newSession
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== PERPLEXITY AI ====================

export async function perplexitySearch(query, options = {}, retryCount = 0) {
  const { mode = "concise", focus = "internet" } = options;
  
  try {
    const homeRes = await fetch(CONFIG.ENDPOINTS.PERPLEXITY + "/", {
      headers: buildHeaders({ 'Accept': 'text/html' })
    });
    const setCookies = homeRes.headers.getSetCookie?.() || [];
    const initialCookies = setCookies.map(c => c.split(';')[0]).join('; ');
    
    const visitorId = randomUUID();
    const sessionId = randomUUID();
    const edgeVid = randomUUID();
    const edgeSid = randomUUID();
    
    const finalCookie = `pplx.visitor-id=${visitorId}; pplx.session-id=${sessionId}; pplx.edge-vid=${edgeVid}; pplx.edge-sid=${edgeSid}; pplx.trackingAllowed=true; ${initialCookies}`;
    
    const requestId = randomUUID();
    const contextUuid = randomUUID();
    const cacheKey = randomUUID();
    const rumSessionId = randomUUID();
    
    const payload = {
      params: {
        attachments: [], language: "en-US", timezone: "UTC",
        search_focus: focus, sources: ["web"],
        frontend_uuid: randomUUID(), mode, model_preference: "turbo",
        is_related_query: false, is_sponsored: false,
        frontend_context_uuid: contextUuid, prompt_source: "user",
        query_source: "home", is_incognito: false,
        time_from_first_type: 3000 + Math.floor(Math.random() * 4000),
        local_search_enabled: false, use_schematized_api: true,
        send_back_text_in_streaming_api: false,
        client_coordinates: null, mentions: [], dsl_query: query,
        skip_search_enabled: true, is_nav_suggestions_disabled: false,
        source: "default", always_search_override: false,
        override_no_search: false, client_search_results_cache_key: cacheKey,
        should_ask_for_mcp_tool_confirmation: true,
        browser_agent_allow_once_from_toggle: false,
        force_enable_browser_agent: false, extended_context: false,
        version: "2.18", rum_session_id: rumSessionId
      },
      query_str: query
    };
    
    const res = await fetch(`${CONFIG.ENDPOINTS.PERPLEXITY}/rest/sse/perplexity_ask`, {
      method: "POST",
      headers: {
        "accept": "text/event-stream", "content-type": "application/json",
        "cookie": finalCookie, "origin": CONFIG.ENDPOINTS.PERPLEXITY,
        "referer": CONFIG.ENDPOINTS.PERPLEXITY + "/",
        "user-agent": CONFIG.UA_DESKTOP,
        "x-perplexity-request-endpoint": `${CONFIG.ENDPOINTS.PERPLEXITY}/rest/sse/perplexity_ask`,
        "x-perplexity-request-reason": "ask-query-state-provider",
        "x-request-id": requestId
      },
      body: JSON.stringify(payload)
    });
    
    if (res.status === 429) {
      if (retryCount < 3) {
        await sleep(2000 * (retryCount + 1));
        return perplexitySearch(query, options, retryCount + 1);
      }
      return { error: "Rate limited. Please try again later." };
    }
    
    if (!res.ok || !res.body) return { error: `Perplexity error: ${res.status}` };
    
    let lastChunk = null;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || "";
      for (const ev of events) {
        if (!ev.trim()) continue;
        let dataStr = "";
        for (const ln of ev.split(/\r?\n/)) {
          if (ln.startsWith("data: ")) dataStr += ln.slice(6);
          else if (ln.startsWith("data:")) dataStr += ln.slice(5).trim();
        }
        if (!dataStr || dataStr === "{}") continue;
        try {
          const obj = JSON.parse(dataStr);
          if (obj && typeof obj === "object" && Object.keys(obj).length > 0) {
            lastChunk = obj;
          }
        } catch {}
      }
    }
    
    let answer = "";
    let sources = [];
    
    if (lastChunk?.text) {
      try {
        const steps = JSON.parse(lastChunk.text);
        const finalStep = steps.find(s => s.step_type === "FINAL");
        if (finalStep?.content?.answer) {
          const inner = JSON.parse(finalStep.content.answer);
          answer = inner.answer || "";
        }
      } catch {}
    }
    
    if (lastChunk?.sources) {
      sources = lastChunk.sources.map(s => ({
        title: s.name || s.title || "",
        url: s.url || s.link || "",
        domain: s.url ? new URL(s.url).hostname.replace(/^www\./, "") : null
      }));
    }
    
    return {
      answer: answer.replace(/【\d+†[^】]*】/g, "").trim(),
      sources: sources,
      mode: mode,
      focus: focus
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== BLACKBOX.AI ====================

export async function blackboxChat(prompt, sessionId = null, options = {}) {
  const { webSearch = false, maxTokens = 1024 } = options;
  
  try {
    const homeRes = await fetch(CONFIG.ENDPOINTS.BLACKBOX + "/", {
      headers: buildHeaders({ 'Accept': 'text/html' })
    });
    const html = await homeRes.text();
    
    let validated = CONFIG.FALLBACKS.BLACKBOX_FALLBACK_VALIDATED;
    const uuidMatch = html.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/);
    if (uuidMatch) validated = uuidMatch[1];
    
    let session = sessionId ? sessionManager.get(sessionId) : null;
    let history = session?.history || [];
    
    const systemPrompt = "Wrap your entire reply between <answer> and </answer> tags. Write nothing outside these tags.";
    const userMessage = { id: randomId(), role: "user", content: String(prompt) };
    const messages = [
      { id: randomId(), role: "system", content: systemPrompt },
      ...history,
      userMessage
    ];
    
    const payload = {
      messages: messages,
      userSelectedAgent: "VscodeAgent",
      userSelectedModel: null,
      maxTokens: maxTokens,
      validated: validated,
      clickedForceWebSearch: webSearch,
      webSearchModeOption: { autoMode: !webSearch, webMode: webSearch, offlineMode: false },
      codeModelMode: true,
      isPremium: false
    };
    
    const res = await fetch(`${CONFIG.ENDPOINTS.BLACKBOX}/api/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "origin": CONFIG.ENDPOINTS.BLACKBOX,
        "referer": `${CONFIG.ENDPOINTS.BLACKBOX}/chat`,
        "user-agent": CONFIG.UA_DESKTOP
      },
      body: JSON.stringify(payload)
    });
    
    const raw = await res.text();
    
    if (res.status === 429) {
      return { error: "Rate limited. Please try again later." };
    }
    
    const answerMatch = raw.match(/<answer>([\s\S]*?)<\/answer>/);
    let answer = answerMatch ? answerMatch[1].trim() : raw.trim();
    
    if (!answer || answer.includes("deprecated") || answer.length < 5) {
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0]);
          if (jsonData.text) answer = jsonData.text;
          if (jsonData.message) answer = jsonData.message;
          if (jsonData.reply) answer = jsonData.reply;
        }
      } catch {}
      
      if (!answer || answer.includes("deprecated") || answer.length < 5) {
        answer = "I'm here to help! What would you like to know?";
      }
    }
    
    const assistantMessage = { id: randomId(), role: "assistant", content: answer };
    const newHistory = [...history, userMessage, assistantMessage];
    const newSessionId = sessionManager.create({ history: newHistory, validated });
    
    return {
      reply: answer,
      session: newSessionId
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== TONGYI (ALIBABA QWEN) ====================

export async function tongyiChat(prompt, sessionId = null, options = {}) {
  const { search = false } = options;
  
  try {
    const deviceId = randomString(24);
    let cookie = null;
    let session = sessionId ? sessionManager.get(sessionId) : null;
    
    if (session?.cookie) {
      cookie = session.cookie;
    } else {
      const initRes = await fetch(`${CONFIG.ENDPOINTS.TONGYI}/dialog/guest/init`, {
        method: "POST",
        headers: {
          "User-Agent": CONFIG.UA_MOBILE,
          "X-DeviceId": deviceId,
          "Content-Type": "application/json"
        },
        body: "{}"
      });
      
      const setCookies = initRes.headers.getSetCookie?.() || [];
      cookie = setCookies.map(c => c.split(';')[0]).join('; ');
      
      if (!cookie) return { error: "Guest init failed" };
    }
    
    const payload = {
      action: "next",
      mode: "chat",
      userAction: "chat",
      requestId: randomUUID(),
      sessionId: session?.tongyiSessionId || "",
      sessionType: "text_chat",
      parentMsgId: session?.parentMsgId || "",
      openSearch: search,
      contents: [{ content: prompt, contentType: "text", role: "user" }]
    };
    
    const res = await fetch(`${CONFIG.ENDPOINTS.TONGYI}/dialog/guest/conversation`, {
      method: "POST",
      headers: {
        "User-Agent": CONFIG.UA_MOBILE,
        "X-DeviceId": deviceId,
        "Cookie": cookie,
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok || !res.body) return { error: `Tongyi error: ${res.status}` };
    
    let fullReply = "";
    let finalEvent = null;
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.msgStatus === "finished") finalEvent = evt;
          if (evt.contents) {
            for (const content of evt.contents) {
              if (content.contentType === "text") fullReply += content.content;
            }
          }
        } catch {}
      }
    }
    
    const newSessionId = sessionManager.create({
      cookie: cookie,
      tongyiSessionId: finalEvent?.sessionId || null,
      parentMsgId: finalEvent?.msgId || null,
      deviceId: deviceId
    });
    
    return {
      reply: fullReply.trim() || "No response",
      session: newSessionId
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== GEMINI PLACEHOLDER ====================

export async function geminiChat(prompt, sessionId = null) {
  return { error: "Gemini endpoint coming soon" };
}

// ==================== ROUTE HANDLERS ====================

export async function handleAIChat(request, url) {
  const path = url.pathname;
  const query = url.searchParams.get('q');
  const session = url.searchParams.get('session');
  
  let model = path.slice(5);
  
  if (!AVAILABLE_MODELS[model]) {
    const match = Object.entries(AVAILABLE_MODELS).find(([short, full]) => full === model);
    if (match) model = match[0];
    else return errorResponse(`Unknown model: ${model}`, 400);
  }
  
  if (!query) return errorResponse('Missing "q" parameter', 400);
  
  const result = await chatdayChat(query, model, session);
  return jsonResponse(result);
}

export async function handlePerplexity(request, url) {
  const query = url.searchParams.get('q');
  const mode = url.searchParams.get('mode') || 'concise';
  const focus = url.searchParams.get('focus') || 'internet';
  
  if (!query) return errorResponse('Missing "q" parameter', 400);
  
  const result = await perplexitySearch(query, { mode, focus });
  return jsonResponse(result);
}

export async function handleBlackbox(request, url) {
  const query = url.searchParams.get('q');
  const session = url.searchParams.get('session');
  const webSearch = url.searchParams.get('search') === 'true';
  
  if (!query) return errorResponse('Missing "q" parameter', 400);
  
  const result = await blackboxChat(query, session, { webSearch });
  return jsonResponse(result);
}

export async function handleTongyi(request, url) {
  const query = url.searchParams.get('q');
  const session = url.searchParams.get('session');
  const search = url.searchParams.get('search') === 'true';
  
  if (!query) return errorResponse('Missing "q" parameter', 400);
  
  const result = await tongyiChat(query, session, { search });
  return jsonResponse(result);
}

export async function handleModels(request, url) {
  const models = Object.keys(AVAILABLE_MODELS).map(short => ({
    name: short,
    full_name: AVAILABLE_MODELS[short],
    example: `/api/${short}?q=Hello`
  }));
  
  return jsonResponse({ total: models.length, models });
}

export function listAllModels() {
  return Object.keys(AVAILABLE_MODELS);
}

// ==================== EXPORT ====================

export default {
  AVAILABLE_MODELS,
  chatdayChat,
  perplexitySearch,
  blackboxChat,
  tongyiChat,
  geminiChat,
  handleAIChat,
  handlePerplexity,
  handleBlackbox,
  handleTongyi,
  handleModels,
  listAllModels
};
