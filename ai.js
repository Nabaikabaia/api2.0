// ai.js - Complete AI Chat Services (Full Power)
// Services: Chatday (20+ models), Perplexity, Blackbox, Tongyi, Copilot, DuckAI, Quillbot, Asyntai

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

// ==================== PERPLEXITY AI (FIXED) ====================

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
    
    // FIX: Check if sources is an array before mapping
    if (lastChunk?.sources && Array.isArray(lastChunk.sources)) {
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

// ==================== MICROSOFT COPILOT (WebSocket) ====================

export async function copilotChat(prompt, model = 'default') {
  try {
    const models = {
      default: 'chat',
      'think-deeper': 'reasoning',
      'gpt-5': 'smart'
    };
    
    if (!models[model]) {
      return { error: `Available models: ${Object.keys(models).join(', ')}` };
    }
    
    // Create conversation
    const convRes = await fetch('https://copilot.microsoft.com/c/api/conversations', {
      method: 'POST',
      headers: {
        'Origin': 'https://copilot.microsoft.com',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
      }
    });
    
    const convData = await convRes.json();
    const conversationId = convData.id;
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(
        `wss://copilot.microsoft.com/c/api/chat?api-version=2&features=-,ncedge,edgepagecontext&setflight=-,ncedge,edgepagecontext&ncedge=1`
      );
      
      let text = '';
      let citations = [];
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          event: 'setOptions',
          supportedFeatures: ['partial-generated-images'],
          supportedCards: ['weather', 'local', 'image', 'sports', 'video', 'ads', 'safetyHelpline', 'quiz', 'finance', 'recipe'],
          ads: { supportedTypes: ['text', 'product', 'multimedia', 'tourActivity', 'propertyPromotion'] }
        }));
        
        ws.send(JSON.stringify({
          event: 'send',
          mode: models[model],
          conversationId: conversationId,
          content: [{ type: 'text', text: prompt }],
          context: {}
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          switch (parsed.event) {
            case 'appendText':
              text += parsed.text || '';
              break;
            case 'citation':
              citations.push({ title: parsed.title, icon: parsed.iconUrl, url: parsed.url });
              break;
            case 'done':
              resolve({ result: text, citations });
              ws.close();
              break;
            case 'error':
              reject(new Error(parsed.message));
              ws.close();
              break;
          }
        } catch (error) {
          reject(error);
        }
      };
      
      ws.onerror = reject;
    });
    
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== DUCK.AI ====================

export async function duckChat(prompt, model = 'gpt-5-mini') {
  try {
    const messageId = randomUUID();
    const conversationId = randomUUID();
    const journeyId = randomString(32);
    
    const payload = {
      model: model,
      metadata: {
        toolChoice: {
          NewsSearch: false,
          VideosSearch: false,
          LocalSearch: false,
          WeatherForecast: false
        }
      },
      messages: [{ role: "user", content: prompt }],
      canUseTools: true,
      reasoningEffort: "minimal",
      canUseApproxLocation: null,
      canDelegateImageGeneration: null,
      durableStream: {
        messageId: messageId,
        conversationId: conversationId,
        publicKey: {
          alg: "RSA-OAEP-256",
          e: "AQAB",
          ext: true,
          key_ops: ["encrypt"],
          kty: "RSA",
          n: "pjxk580D6CN5b3u5TR_XEQqrv7V4459F4lyt6mV_w5pdJjr8e0ILRmeR6k-yiC-RjaKUXLO5rPvGXzd5CixEs6tgqAmMJntA8tlA5H_E9-YuvHyPSTs4BUBIEqMAK1srpz1PAy8Xi9O4bN4i2FreokKKOJMMpvFt_rGzBnbpjlyE6fdHTmJCUFrjSyxlD-D4tklTMDs-0HjUNynfr6k6-PJvPguLIYq7L_NjCA7kcFUHXzQnWQjmpXGTm0NqPXeYUnL3y2jsirBePfYW_SNaB6TePEGoMSQL8rsqP67Snz0sBo7WKGdbYjH2jXv7bBU4rZZXcRK1Rk-w076IiH3Q_w",
          use: "enc"
        }
      }
    };
    
    const res = await fetch('https://duck.ai/duckchat/v1/chat', {
      method: 'POST',
      headers: {
        'authority': 'duck.ai',
        'accept': 'text/event-stream',
        'content-type': 'application/json',
        'origin': 'https://duck.ai',
        'referer': 'https://duck.ai/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
        'x-ddg-journey-id': journeyId,
        'x-fe-signals': `eyJzdGFydCI6${Date.now()}LCJldmVudHMiOltdLCJlbmQiOjB9`,
        'x-fe-version': 'serp_20260615_183429_ET-ec17a44c4ba5177d076644699c451976233a9143',
        'x-vqd-hash-1': 'eyJzZXJ2ZXJfaGFzaGVzIjpbIjF5cDZvWEg1U1puWmtlZThValorWVpXVGt3WS9pWUd1TXlmV0pRM2d2Z0k9IiwiWnUvVGFJR3lLY2s4T0xDQVZZakI5eGl1ajlQcGd2V2V1WEUzUE1ubVJwbz0iLCJKL09xODg2N0tDUFZKcjE5TGJoemhaai9mLzhUeFRYdzhWeWhZazNRc2pFPSJdLCJjbGllbnRfaGFzaGVzIjpbIkFiTkpDQmJ2Njk4d3Z2SnNkTkNZNDBXOFlIeUhmWm9EVEVHS3Rhd2xRRE09IiwiQUdBemh1TXhSbkNEY2phYkJTbnR3a2syRE1Zb3BoYS9WWVhET1RjV2JnTT0iLCIvWm5xamVYQnQzczkvWkRrU05ubnJ5YmZWbHZCZnVFTkRhMlNaL0U5YmU4PSJdLCJzaWduYWxzIjp7fSwibWV0YSI6eyJ2IjoiNCIsImNoYWxsZW5nZV9pZCI6IjMwMGFhYzA3Y2RmM2JjNzY1YzNhZmZkNzAyZTVmNjUyMGJiMzQ1YjdiMjUxMTAyYjYxYjdkMWE0NjFlNjNmNTB2ejk1biIsInRpbWVzdGFtcCI6IjE3ODE1ODg4NjA0MjYiLCJkZWJ1ZyI6IkJKIiwib3JpZ2luIjoiaHR0cHM6Ly9kdWNrLmFpIiwic3RhY2siOiJFcnJvclxuYXQgbCAoaHR0cHM6Ly9kdWNrLmFpL2Rpc3QvZHVja2FpLWRpc3QvZW50cnkuZHVja2FpLjdiMzNkZDA4MzYzMjExNTA1NGE0LmpzOjI6MTQxNzIwNClcbmF0IGFzeW5jIGh0dHBzOi8vZHVjay5haS9kaXN0L2R1Y2thaS1kaXN0L2VudHJ5LmR1Y2thaS43YjMzZGQwODM2MzIxMTUwNTRhNC5qczoyOjEyNjU1MzMiLCJkdXJhdGlvbiI6IjE0MSJ9fQ=='
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok || !res.body) {
      return { error: `Duck.ai error: ${res.status}` };
    }
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullReply = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.message) {
              fullReply += parsed.message;
            }
          } catch (e) {}
        }
      }
    }
    
    return {
      result: fullReply.trim() || "No response from Duck.ai",
      model: model
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== QUILLBOT AI ====================

const quillbotSessions = new Map();
const MAX_MESSAGES_PER_SESSION = 5;

function generateHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function createQuillbotSession() {
  return {
    conversation_id: randomUUID(),
    device_id: randomUUID(),
    message_count: 0,
    created_at: new Date().toISOString()
  };
}

function getQuillbotSession(sessionId = null) {
  if (sessionId && quillbotSessions.has(sessionId)) {
    const session = quillbotSessions.get(sessionId);
    if (session.message_count < MAX_MESSAGES_PER_SESSION) {
      return { session, new_session: false };
    }
  }
  
  const session = createQuillbotSession();
  quillbotSessions.set(session.conversation_id, session);
  return { session, new_session: true };
}

function updateQuillbotSession(conversationId) {
  const session = quillbotSessions.get(conversationId);
  if (session) {
    session.message_count += 1;
    session.updated_at = new Date().toISOString();
    quillbotSessions.set(conversationId, session);
  }
  return session;
}

function parseNDJSON(text) {
  const chunks = [];
  const lines = text.split(/\r?\n/);
  
  for (const line of lines) {
    const clean = line.trim();
    if (!clean || !clean.startsWith('{')) continue;
    
    try {
      const json = JSON.parse(clean);
      if (json.type === 'content' && typeof json.content === 'string') {
        chunks.push(json.content);
      }
    } catch (e) {}
  }
  
  return chunks.join('').trim();
}

export async function quillbotChat(prompt, sessionId = null) {
  try {
    const { session, new_session } = getQuillbotSession(sessionId);
    
    const traceId = generateHex(16);
    const spanId = generateHex(8);
    const sampleRand = Math.random();
    
    const body = {
      message: { content: `${prompt}\n\n` },
      context: {
        editorContext: '',
        selectionContext: '',
        userDialect: 'en-us',
        apiVersion: 2
      },
      origin: { name: 'ai-chat.chat', url: 'https://quillbot.com' }
    };
    
    const res = await fetch(`https://quillbot.com/api/ai-chat/chat/conversation/${session.conversation_id}`, {
      method: 'POST',
      headers: {
        'cache-control': 'max-age=0',
        'sec-ch-ua-platform': '"Android"',
        'platform-type': 'webapp',
        'qb-product': 'AI-CHAT',
        'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
        'sec-ch-ua-mobile': '?1',
        'useridtoken': 'empty-token',
        'baggage': `sentry-environment=prod,sentry-release=v42.51.6,sentry-public_key=5743ef12f4887fc460c7968ebb2de54d,sentry-trace_id=${traceId},sentry-sampled=false,sentry-sample_rand=${sampleRand},sentry-sample_rate=0.01`,
        'sentry-trace': `${traceId}-${spanId}-0`,
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
        'accept': 'text/event-stream',
        'webapp-version': '42.51.6',
        'content-type': 'application/json',
        'origin': 'https://quillbot.com',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'referer': `https://quillbot.com/ai-chat/c/${session.conversation_id}`,
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      body: JSON.stringify(body)
    });
    
    const raw = await res.text();
    const result = parseNDJSON(raw);
    const success = res.ok && result;
    
    if (success) {
      updateQuillbotSession(session.conversation_id);
    }
    
    const updatedSession = quillbotSessions.get(session.conversation_id) || session;
    
    return {
      reply: result || "No response",
      conversation_id: session.conversation_id,
      message_count: updatedSession.message_count,
      new_session: new_session,
      max_messages: MAX_MESSAGES_PER_SESSION
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== ASYNTAI AI ====================

const asyntaiSessions = new Map();

function generateAsyntaiSessionId() {
  return 'session_' + Math.random().toString(36).substring(2, 14);
}

export async function asyntaiChat(message, sessionId = null) {
  try {
    let currentSessionId = sessionId;
    
    if (!currentSessionId) {
      const stored = asyntaiSessions.get('current');
      if (stored) {
        currentSessionId = stored;
      } else {
        currentSessionId = generateAsyntaiSessionId();
        asyntaiSessions.set('current', currentSessionId);
      }
    }
    
    const requestData = {
      widget_id: "asyntai_2bcd9dfbae24",
      message: message,
      session_id: currentSessionId
    };
    
    const response = await fetch('https://asyntai.com/api/widget-chat/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      return { error: `Asyntai error: ${response.status}` };
    }
    
    const data = await response.json();
    
    if (data.session_id) {
      asyntaiSessions.set('current', data.session_id);
      currentSessionId = data.session_id;
    }
    
    return {
      reply: data.reply || "No response from Asyntai",
      session_id: currentSessionId
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== GEMINI (PLACEHOLDER) ====================

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

export async function handleCopilot(request, url) {
  const query = url.searchParams.get('q');
  const model = url.searchParams.get('model') || 'default';
  
  if (!query) return errorResponse('Missing "q" parameter', 400);
  
  const result = await copilotChat(query, model);
  return jsonResponse(result);
}

export async function handleDuckAI(request, url) {
  const query = url.searchParams.get('q');
  const model = url.searchParams.get('model') || 'gpt-5-mini';
  
  if (!query) return errorResponse('Missing "q" parameter', 400);
  
  const result = await duckChat(query, model);
  return jsonResponse(result);
}

export async function handleQuillbot(request, url) {
  const query = url.searchParams.get('q');
  const session = url.searchParams.get('session');
  
  if (!query) return errorResponse('Missing "q" parameter', 400);
  
  const result = await quillbotChat(query, session);
  return jsonResponse(result);
}

export async function handleAsyntai(request, url) {
  const query = url.searchParams.get('q');
  const session = url.searchParams.get('session');
  
  if (!query) return errorResponse('Missing "q" parameter', 400);
  
  const result = await asyntaiChat(query, session);
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
  copilotChat,
  duckChat,
  quillbotChat,
  asyntaiChat,
  geminiChat,
  handleAIChat,
  handlePerplexity,
  handleBlackbox,
  handleTongyi,
  handleCopilot,
  handleDuckAI,
  handleQuillbot,
  handleAsyntai,
  handleModels,
  listAllModels
};
