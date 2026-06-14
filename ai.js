// ai.js - Complete AI Chat Services with ALL 20+ Models

import { CONFIG } from './config.js';
import {
  randomUUID, randomId, randomString,
  parseSSE, fetchJSON, sleep,
  sessionManager, buildHeaders, buildMobileHeaders,
  jsonResponse, errorResponse
} from './utils.js';

// ==================== ALL AVAILABLE MODELS ====================

export const AVAILABLE_MODELS = {
  // OpenAI
  'gpt55': 'openai/gpt-5.5',
  'gpt54': 'openai/gpt-5.4',
  'gpt53chat': 'openai/gpt-5.3-chat',
  'gpt51instant': 'openai/gpt-5.1-instant',
  'gpt5': 'openai/gpt-5',
  'gpt4o': 'openai/gpt-4o',
  'gpt4omini': 'openai/gpt-4o-mini',
  
  // Anthropic Claude
  'claude-opus': 'anthropic/claude-opus-4.8',
  'claude-opus-47': 'anthropic/claude-opus-4.7',
  'claude-opus-46': 'anthropic/claude-opus-4.6',
  'claude-opus-45': 'anthropic/claude-opus-4.5',
  'claude-sonnet': 'anthropic/claude-sonnet-4.6',
  'claude-haiku': 'anthropic/claude-haiku-4.5',
  'claude-fable': 'anthropic/claude-fable-5',
  
  // DeepSeek
  'deepseek-pro': 'deepseek/deepseek-v4-pro',
  'deepseek-flash': 'deepseek/deepseek-v4-flash',
  'deepseek-thinking': 'deepseek/deepseek-v3.2-thinking',
  
  // Google Gemini
  'gemini-pro': 'google/gemini-3.1-pro-preview',
  'gemini-3-pro': 'google/gemini-3-pro-preview',
  'gemini-flash': 'google/gemini-3.1-flash-lite',
  
  // xAI Grok
  'grok': 'xai/grok-4.1-fast-non-reasoning',
  
  // Meta Llama
  'llama': 'meta/llama-4-maverick',
  
  // Alibaba Qwen
  'qwen': 'alibaba/qwen3-max',
  
  // Moonshot Kimi
  'kimi': 'moonshotai/kimi-k2.6'
};

// Short names for easy access
export const MODEL_SHORTCUTS = Object.keys(AVAILABLE_MODELS);

// ==================== CHATDAY.AI (ALL 20+ MODELS) ====================

export async function chatdayChat(prompt, model, sessionId = null) {
  try {
    // Get or create session
    let session = sessionId ? sessionManager.get(sessionId) : null;
    if (!session) {
      session = {
        visitorId: randomUUID().replace(/-/g, ''),
        conversationId: randomString(8).toUpperCase() + randomString(8).toUpperCase()
      };
    }
    
    // Map short name to full model name
    const fullModel = AVAILABLE_MODELS[model] || model;
    
    // Anonymous sign-in to get cookie
    const signInRes = await fetch(`${CONFIG.ENDPOINTS.CHATDAY}/api/auth/sign-in/anonymous`, {
      method: 'POST',
      headers: {
        'User-Agent': CONFIG.UA_MOBILE,
        'Origin': CONFIG.ENDPOINTS.CHATDAY,
        'Referer': `${CONFIG.ENDPOINTS.CHATDAY}/chat`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    
    if (!signInRes.ok) {
      return { error: 'Chatday authentication failed', status: signInRes.status };
    }
    
    // Extract cookie
    const setCookies = signInRes.headers.getSetCookie?.() || [];
    const cookie = setCookies.map(c => c.split(';')[0]).join('; ');
    
    // Send chat request with SSE
    const chatRes = await fetch(`${CONFIG.ENDPOINTS.CHATDAY}/api/v2/chat/anonymous`, {
      method: 'POST',
      headers: {
        'User-Agent': CONFIG.UA_MOBILE,
        'Origin': CONFIG.ENDPOINTS.CHATDAY,
        'Referer': `${CONFIG.ENDPOINTS.CHATDAY}/chat`,
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
    
    if (!chatRes.ok || !chatRes.body) {
      return { error: `Chatday API error: ${chatRes.status}` };
    }
    
    // Parse SSE stream
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
    
    // Save session for continuation
    const newSessionId = sessionManager.create({
      visitorId: session.visitorId,
      conversationId: session.conversationId,
      cookie: cookie,
      lastModel: fullModel
    });
    
    return {
      reply: fullReply.trim() || "No response from AI",
      session: newSessionId,
      model: model,
      fullModel: fullModel,
      provider: 'chatday.ai'
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== LIST ALL MODELS ====================

export function listAllModels() {
  const models = [];
  
  for (const [short, full] of Object.entries(AVAILABLE_MODELS)) {
    models.push({
      short_name: short,
      full_name: full,
      example: `/api/${short}?q=Hello world`
    });
  }
  
  return {
    total: models.length,
    models: models,
    categories: {
      openai: ['gpt55', 'gpt54', 'gpt53chat', 'gpt51instant', 'gpt5', 'gpt4o', 'gpt4omini'],
      anthropic: ['claude-opus', 'claude-opus-47', 'claude-opus-46', 'claude-opus-45', 'claude-sonnet', 'claude-haiku', 'claude-fable'],
      deepseek: ['deepseek-pro', 'deepseek-flash', 'deepseek-thinking'],
      google: ['gemini-pro', 'gemini-3-pro', 'gemini-flash'],
      xai: ['grok'],
      meta: ['llama'],
      alibaba: ['qwen'],
      moonshot: ['kimi']
    }
  };
}

// ==================== ROUTE HANDLER FOR AI CHAT ====================

export async function handleAIChat(request, url) {
  const path = url.pathname;
  const query = url.searchParams.get('q');
  const session = url.searchParams.get('session');
  
  // Extract model from path: /api/gpt55 -> gpt55
  let model = path.slice(5); // Remove '/api/'
  
  // Check if model is valid
  if (!AVAILABLE_MODELS[model]) {
    // Try to match as full model name
    const match = Object.entries(AVAILABLE_MODELS).find(([short, full]) => full === model);
    if (match) {
      model = match[0];
    } else {
      return errorResponse(`Unknown model: ${model}. Use /api/models to see available models.`, 400);
    }
  }
  
  if (!query) {
    return errorResponse('Missing "q" parameter. Example: /api/gpt55?q=Hello', 400);
  }
  
  const result = await chatdayChat(query, model, session);
  return jsonResponse(result);
}

// ==================== MODELS ENDPOINT ====================

export async function handleModels(request, url) {
  return jsonResponse(listAllModels());
}

// ==================== PERPLEXITY AI ====================

export async function perplexitySearch(query, options = {}) {
  const { mode = "concise", focus = "internet" } = options;
  
  try {
    // Get initial session cookies
    const homeRes = await fetch(CONFIG.ENDPOINTS.PERPLEXITY + "/", {
      headers: buildHeaders({ 'Accept': 'text/html' })
    });
    
    const setCookies = homeRes.headers.getSetCookie?.() || [];
    const initialCookies = setCookies.map(c => c.split(';')[0]).join('; ');
    
    // Generate session IDs
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
        attachments: [],
        language: "en-US",
        timezone: "UTC",
        search_focus: focus,
        sources: ["web"],
        frontend_uuid: randomUUID(),
        mode: mode,
        model_preference: "turbo",
        is_related_query: false,
        is_sponsored: false,
        frontend_context_uuid: contextUuid,
        prompt_source: "user",
        query_source: "home",
        is_incognito: false,
        time_from_first_type: 3000 + Math.floor(Math.random() * 4000),
        local_search_enabled: false,
        use_schematized_api: true,
        send_back_text_in_streaming_api: false,
        client_coordinates: null,
        mentions: [],
        dsl_query: query,
        skip_search_enabled: true,
        is_nav_suggestions_disabled: false,
        source: "default",
        always_search_override: false,
        override_no_search: false,
        client_search_results_cache_key: cacheKey,
        should_ask_for_mcp_tool_confirmation: true,
        browser_agent_allow_once_from_toggle: false,
        force_enable_browser_agent: false,
        extended_context: false,
        version: "2.18",
        rum_session_id: rumSessionId
      },
      query_str: query
    };
    
    const res = await fetch(`${CONFIG.ENDPOINTS.PERPLEXITY}/rest/sse/perplexity_ask`, {
      method: "POST",
      headers: {
        "accept": "text/event-stream",
        "content-type": "application/json",
        "cookie": finalCookie,
        "origin": CONFIG.ENDPOINTS.PERPLEXITY,
        "referer": CONFIG.ENDPOINTS.PERPLEXITY + "/",
        "user-agent": CONFIG.UA_DESKTOP,
        "x-perplexity-request-endpoint": `${CONFIG.ENDPOINTS.PERPLEXITY}/rest/sse/perplexity_ask`,
        "x-perplexity-request-reason": "ask-query-state-provider",
        "x-perplexity-request-try-number": "1",
        "x-request-id": requestId
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok || !res.body) {
      return { error: `Perplexity API error: ${res.status}` };
    }
    
    // Parse SSE and extract answer
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
    
    // Extract answer from final chunk
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
    
    // Extract sources
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
      focus: focus,
      provider: 'perplexity.ai'
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

export async function handlePerplexity(request, url) {
  const query = url.searchParams.get('q');
  const mode = url.searchParams.get('mode') || 'concise';
  const focus = url.searchParams.get('focus') || 'internet';
  
  if (!query) {
    return errorResponse('Missing "q" parameter. Example: /api/perplexity?q=Who is the president of Indonesia', 400);
  }
  
  const result = await perplexitySearch(query, { mode, focus });
  return jsonResponse(result);
}

// ==================== BLACKBOX.AI ====================

export async function blackboxChat(prompt, sessionId = null, options = {}) {
  const { webSearch = false, maxTokens = 1024 } = options;
  
  try {
    // Get validation token from homepage
    const homeRes = await fetch(CONFIG.ENDPOINTS.BLACKBOX + "/", {
      headers: buildHeaders({ 'Accept': 'text/html' })
    });
    const html = await homeRes.text();
    
    // Extract validated token
    let validated = CONFIG.FALLBACKS.BLACKBOX_FALLBACK_VALIDATED;
    const uuidMatch = html.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/);
    if (uuidMatch) validated = uuidMatch[1];
    
    // Get or create session
    let session = sessionId ? sessionManager.get(sessionId) : null;
    let history = session?.history || [];
    
    // Build messages
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
    
    // Extract answer
    const answerMatch = raw.match(/<answer>([\s\S]*?)<\/answer>/);
    const answer = answerMatch ? answerMatch[1].trim() : raw.trim();
    
    // Update history
    const assistantMessage = { id: randomId(), role: "assistant", content: answer };
    const newHistory = [...history, userMessage, assistantMessage];
    const newSessionId = sessionManager.create({ history: newHistory, validated });
    
    return {
      reply: answer,
      session: newSessionId,
      provider: 'blackbox.ai'
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

export async function handleBlackbox(request, url) {
  const query = url.searchParams.get('q');
  const session = url.searchParams.get('session');
  const webSearch = url.searchParams.get('search') === 'true';
  
  if (!query) {
    return errorResponse('Missing "q" parameter. Example: /api/blackbox?q=How to reverse an array in Python', 400);
  }
  
  const result = await blackboxChat(query, session, { webSearch });
  return jsonResponse(result);
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
      
      if (!cookie) {
        return { error: "Tongyi guest init failed" };
      }
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
    
    if (!res.ok || !res.body) {
      return { error: `Tongyi API error: ${res.status}` };
    }
    
    // Parse SSE
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
      session: newSessionId,
      provider: 'tongyi (Alibaba Qwen)'
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

export async function handleTongyi(request, url) {
  const query = url.searchParams.get('q');
  const session = url.searchParams.get('session');
  const search = url.searchParams.get('search') === 'true';
  
  if (!query) {
    return errorResponse('Missing "q" parameter. Example: /api/tongyi?q=你好', 400);
  }
  
  const result = await tongyiChat(query, session, { search });
  return jsonResponse(result);
}

// ==================== EXPORT ALL ====================

export default {
  AVAILABLE_MODELS,
  MODEL_SHORTCUTS,
  chatdayChat,
  perplexitySearch,
  blackboxChat,
  tongyiChat,
  handleAIChat,
  handlePerplexity,
  handleBlackbox,
  handleTongyi,
  listAllModels,
  handleModels
};
