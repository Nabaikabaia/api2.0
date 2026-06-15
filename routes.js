// routes.js - Complete Routes with ALL 24 AI Models

import { CONFIG } from './config.js';
import { jsonResponse, errorResponse } from './utils.js';

// Import ALL handlers (keep everything working)
import {
  handleAIChat,
  handlePerplexity,
  handleBlackbox,
  handleTongyi,
  handleModels
} from './ai.js';

import {
  handleSpotify,
  handleAppleMusic,
  handleSoundCloud,
  handleRemusic,
  handleSoundCloudDL
} from './music.js';

import {
  handleSaveFrom,
  handleInstagram,
  handleTikTokDownload,
  handleTikTokSearch,
  handleTikTokTrending,
  handleVidboxSearch,
  handleVidboxTrending
} from './video.js';

import {
  handleDeepAI,
  handleIloveimg,
  handlePinterestSearch,
  handlePinterestPin
} from './image.js';

import {
  handleTranscribe,
  handleTerabox,
  handleSecurityScan,
  handleRobloxStalk
} from './tools.js';

// ==================== GET BASE URL ====================

function getBaseUrl(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

// ==================== ALL 24 AI MODELS WITH DESCRIPTIONS & TEST EXAMPLES ====================

const AI_MODELS = [
  // OpenAI (7 models)
  { name: "gpt55", description: "OpenAI GPT-5.5 - Most advanced", test: "Hello, how are you?" },
  { name: "gpt54", description: "OpenAI GPT-5.4", test: "Explain quantum physics" },
  { name: "gpt53chat", description: "OpenAI GPT-5.3 Chat", test: "Tell me a joke" },
  { name: "gpt51instant", description: "OpenAI GPT-5.1 Instant - Fast", test: "Quick summary of AI" },
  { name: "gpt5", description: "OpenAI GPT-5", test: "Write a haiku about coding" },
  { name: "gpt4o", description: "OpenAI GPT-4o - Omni", test: "Explain AI in simple terms" },
  { name: "gpt4omini", description: "OpenAI GPT-4o Mini - Lightweight", test: "What is machine learning?" },
  
  // Anthropic Claude (7 models)
  { name: "claude-opus", description: "Anthropic Claude Opus 4.8 - Most capable", test: "Write a short story" },
  { name: "claude-opus-47", description: "Anthropic Claude Opus 4.7", test: "Explain philosophy" },
  { name: "claude-opus-46", description: "Anthropic Claude Opus 4.6", test: "Analyze this poem" },
  { name: "claude-opus-45", description: "Anthropic Claude Opus 4.5", test: "Help me with math" },
  { name: "claude-sonnet", description: "Anthropic Claude Sonnet 4.6 - Balanced", test: "Help me debug this code" },
  { name: "claude-haiku", description: "Anthropic Claude Haiku 4.5 - Fastest", test: "Quick response needed" },
  { name: "claude-fable", description: "Anthropic Claude Fable 5", test: "Tell me a fable" },
  
  // DeepSeek (3 models)
  { name: "deepseek-pro", description: "DeepSeek V4 Pro - Most powerful", test: "Solve: 2x + 5 = 15" },
  { name: "deepseek-flash", description: "DeepSeek V4 Flash - Fast", test: "What is the capital of France?" },
  { name: "deepseek-thinking", description: "DeepSeek V3.2 Thinking - Reasoning", test: "Explain step by step how to bake a cake" },
  
  // Google Gemini (3 models)
  { name: "gemini-pro", description: "Google Gemini 3.1 Pro", test: "Write a poem about nature" },
  { name: "gemini-3-pro", description: "Google Gemini 3 Pro", test: "Explain quantum computing" },
  { name: "gemini-flash", description: "Google Gemini 3.1 Flash Lite - Fast", test: "What's the weather like?" },
  
  // xAI Grok (1 model)
  { name: "grok", description: "xAI Grok 4.1 Fast", test: "What's trending in AI?" },
  
  // Meta Llama (1 model)
  { name: "llama", description: "Meta Llama 4 Maverick", test: "Chat with me casually" },
  
  // Alibaba Qwen (1 model)
  { name: "qwen", description: "Alibaba Qwen 3 Max", test: "你好，介绍一下自己" },
  
  // Moonshot Kimi (1 model)
  { name: "kimi", description: "Moonshot Kimi K2.6", test: "Explain long context understanding" }
];

// ==================== DOCS PAGE ====================

function getDocsPage(request) {
  const baseUrl = getBaseUrl(request);
  
  return {
    endpoints: {
      ai_chat: {
        description: "Chat with 24 AI models",
        usage: "GET /api/{model}?q=your+question",
        total_models: AI_MODELS.length,
        models: AI_MODELS.map(model => ({
          name: model.name,
          description: model.description,
          test_example: `${baseUrl}/api/${model.name}?q=${encodeURIComponent(model.test)}`
        }))
      },
      utility: {
        description: "Utility endpoints",
        endpoints: [
          { method: "GET", path: "/api/models", description: "List all available AI models" },
          { method: "GET", path: "/docs", description: "This documentation page" }
        ]
      }
    },
    note: "All responses are automatically formatted with pretty JSON (2-space indentation)"
  };
}

// ==================== HOME PAGE ====================

function getHomePage(request) {
  const baseUrl = getBaseUrl(request);
  
  return {
    service: "Nabees Apis 2.0",
    version: "2.0",
    ai_models: {
      description: "Chat with 24 AI models",
      usage: "GET /api/{model}?q=your+question",
      total_models: AI_MODELS.length,
      models: AI_MODELS.map(model => ({
        name: model.name,
        description: model.description,
        test: `${baseUrl}/api/${model.name}?q=${encodeURIComponent(model.test)}`
      })),
      quick_start: `${baseUrl}/api/gpt55?q=Hello%20world`
    },
    documentation: `${baseUrl}/docs`
  };
}

// ==================== ROUTES ====================

const routes = {
  // AI Chat Routes
  'GET /api/models': handleModels,
  'GET /api/chat': handleAIChat,
  'GET /api/perplexity': handlePerplexity,
  'GET /api/blackbox': handleBlackbox,
  'GET /api/tongyi': handleTongyi,
  
  // Music Routes
  'GET /api/spotify': handleSpotify,
  'GET /api/applemusic': handleAppleMusic,
  'GET /api/soundcloud': handleSoundCloud,
  'GET /api/remusic': handleRemusic,
  'GET /api/soundcloud/dl': handleSoundCloudDL,
  
  // Video Routes
  'GET /api/download': handleSaveFrom,
  'GET /api/instagram': handleInstagram,
  'GET /api/tiktok': handleTikTokDownload,
  'GET /api/tiktok/search': handleTikTokSearch,
  'GET /api/tiktok/trending': handleTikTokTrending,
  'GET /api/movies': handleVidboxSearch,
  'GET /api/movies/trending': handleVidboxTrending,
  
  // Image Routes
  'GET /api/image/edit': handleDeepAI,
  'GET /api/image/upscale': handleIloveimg,
  'GET /api/pinterest/search': handlePinterestSearch,
  'GET /api/pinterest/pin': handlePinterestPin,
  
  // Tools Routes
  'GET /api/transcribe': handleTranscribe,
  'GET /api/terabox': handleTerabox,
  'GET /api/security/scan': handleSecurityScan,
  'GET /api/roblox': handleRobloxStalk
};

// ==================== HANDLER ====================

export async function handleRequest(request, url, path) {
  const method = request.method;
  const routeKey = `${method} ${path}`;
  
  // Docs page
  if (path === '/docs' || path === '/api/docs') {
    return jsonResponse(getDocsPage(request));
  }
  
  // Home page
  if (path === '/' || path === '') {
    return jsonResponse(getHomePage(request));
  }
  
  // Check exact routes
  if (routes[routeKey]) {
    return routes[routeKey](request, url);
  }
  
  // Dynamic AI model routes
  if (method === 'GET' && path.startsWith('/api/')) {
    const modelName = path.slice(5);
    const reservedRoutes = [
      'models', 'chat', 'perplexity', 'blackbox', 'tongyi',
      'spotify', 'applemusic', 'soundcloud', 'remusic', 'soundcloud/dl',
      'download', 'instagram', 'tiktok', 'tiktok/search', 'tiktok/trending',
      'movies', 'movies/trending',
      'image/edit', 'image/upscale', 'pinterest/search', 'pinterest/pin',
      'transcribe', 'terabox', 'security/scan', 'roblox', 'docs'
    ];
    
    if (!reservedRoutes.includes(modelName) && CONFIG.CHAT_MODELS[modelName]) {
      return handleAIChat(request, url);
    }
  }
  
  return errorResponse(`Not found: ${method} ${path}\nVisit /docs for available endpoints`, 404);
}

// ==================== CORS ====================

export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export default {
  handleRequest,
  handleOptions
};
