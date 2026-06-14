// routes.js - Complete Route Handler for All Services

import { CONFIG } from './config.js';
import { jsonResponse, errorResponse } from './utils.js';

// Import all service handlers
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

// ==================== GET BASE URL DYNAMICALLY ====================

function getBaseUrl(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

// ==================== DOCS PAGE ====================

function getDocsPage(request) {
  const baseUrl = getBaseUrl(request);
  
  // Build examples for ALL models
  const allModelExamples = [
    { endpoint: `${baseUrl}/api/gpt55?q=Hello world`, description: "OpenAI GPT-5.5" },
    { endpoint: `${baseUrl}/api/gpt54?q=Hello world`, description: "OpenAI GPT-5.4" },
    { endpoint: `${baseUrl}/api/gpt53chat?q=Hello world`, description: "OpenAI GPT-5.3 Chat" },
    { endpoint: `${baseUrl}/api/gpt51instant?q=Hello world`, description: "OpenAI GPT-5.1 Instant" },
    { endpoint: `${baseUrl}/api/gpt5?q=Hello world`, description: "OpenAI GPT-5" },
    { endpoint: `${baseUrl}/api/gpt4o?q=Hello world`, description: "OpenAI GPT-4o" },
    { endpoint: `${baseUrl}/api/gpt4omini?q=Hello world`, description: "OpenAI GPT-4o Mini" },
    { endpoint: `${baseUrl}/api/claude-opus?q=Tell me a joke`, description: "Anthropic Claude Opus 4.8" },
    { endpoint: `${baseUrl}/api/claude-opus-47?q=Tell me a joke`, description: "Anthropic Claude Opus 4.7" },
    { endpoint: `${baseUrl}/api/claude-opus-46?q=Tell me a joke`, description: "Anthropic Claude Opus 4.6" },
    { endpoint: `${baseUrl}/api/claude-opus-45?q=Tell me a joke`, description: "Anthropic Claude Opus 4.5" },
    { endpoint: `${baseUrl}/api/claude-sonnet?q=Tell me a joke`, description: "Anthropic Claude Sonnet 4.6" },
    { endpoint: `${baseUrl}/api/claude-haiku?q=Tell me a joke`, description: "Anthropic Claude Haiku 4.5" },
    { endpoint: `${baseUrl}/api/claude-fable?q=Tell me a joke`, description: "Anthropic Claude Fable 5" },
    { endpoint: `${baseUrl}/api/deepseek-pro?q=Explain quantum physics`, description: "DeepSeek V4 Pro" },
    { endpoint: `${baseUrl}/api/deepseek-flash?q=Quick answer`, description: "DeepSeek V4 Flash" },
    { endpoint: `${baseUrl}/api/deepseek-thinking?q=Solve a math problem`, description: "DeepSeek V3.2 Thinking" },
    { endpoint: `${baseUrl}/api/gemini-pro?q=Write a poem`, description: "Google Gemini 3.1 Pro" },
    { endpoint: `${baseUrl}/api/gemini-3-pro?q=Write a story`, description: "Google Gemini 3 Pro" },
    { endpoint: `${baseUrl}/api/gemini-flash?q=Fast response`, description: "Google Gemini 3.1 Flash Lite" },
    { endpoint: `${baseUrl}/api/grok?q=What is AI?`, description: "xAI Grok 4.1 Fast" },
    { endpoint: `${baseUrl}/api/llama?q=Hello`, description: "Meta Llama 4 Maverick" },
    { endpoint: `${baseUrl}/api/qwen?q=你好`, description: "Alibaba Qwen 3 Max" },
    { endpoint: `${baseUrl}/api/kimi?q=Hello`, description: "Moonshot Kimi K2.6" },
    { endpoint: `${baseUrl}/api/perplexity?q=Who is president`, description: "Perplexity AI (Web Search)" },
    { endpoint: `${baseUrl}/api/blackbox?q=Code a website`, description: "Blackbox AI (Coding)" },
    { endpoint: `${baseUrl}/api/tongyi?q=Explain AI`, description: "Alibaba Tongyi Qwen" }
  ];
  
  return {
    service: "Nabees Apis 2.0",
    title: "NABEES AI Gateway API Documentation",
    description: "Complete API Gateway for AI Chat, Music, Video, Image, and Tools",
    base_url: baseUrl,
    creator: "NABEES",
    provider: "NABEES TECH NAIJA DEVOPS",
    country: "Nigeria",
    whatsapp_channel: "https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j",
    endpoints: {
      ai_chat: {
        description: "Chat with 24+ AI models",
        total_models: 27,
        usage: "GET /api/{model}?q=your+question",
        examples: allModelExamples
      },
      music: {
        description: "Search and stream music",
        endpoints: [
          { method: "GET", path: `${baseUrl}/api/spotify`, params: "?q=song+name", example: `${baseUrl}/api/spotify?q=Blinding Lights` },
          { method: "GET", path: `${baseUrl}/api/soundcloud`, params: "?q=track+name", example: `${baseUrl}/api/soundcloud?q=raindance` },
          { method: "GET", path: `${baseUrl}/api/remusic`, params: "?q=prompt&styles=Jazz", example: `${baseUrl}/api/remusic?q=calm piano&styles=Jazz` }
        ]
      },
      video: {
        description: "Download videos and search movies",
        endpoints: [
          { method: "GET", path: `${baseUrl}/api/download`, params: "?url=video_url", example: `${baseUrl}/api/download?url=https://youtube.com/watch?v=xxx` },
          { method: "GET", path: `${baseUrl}/api/instagram`, params: "?url=instagram_url", example: `${baseUrl}/api/instagram?url=https://instagram.com/p/xxx` },
          { method: "GET", path: `${baseUrl}/api/tiktok`, params: "?url=tiktok_url", example: `${baseUrl}/api/tiktok?url=https://tiktok.com/@user/video/xxx` },
          { method: "GET", path: `${baseUrl}/api/movies`, params: "?q=movie_name", example: `${baseUrl}/api/movies?q=transformers` }
        ]
      },
      image: {
        description: "Edit, upscale, and search images",
        endpoints: [
          { method: "GET", path: `${baseUrl}/api/image/edit`, params: "?url=image_url&prompt=edit", example: `${baseUrl}/api/image/edit?url=image.jpg&prompt=cinematic` },
          { method: "GET", path: `${baseUrl}/api/image/upscale`, params: "?url=image_url&scale=4", example: `${baseUrl}/api/image/upscale?url=image.jpg&scale=4` },
          { method: "GET", path: `${baseUrl}/api/pinterest/search`, params: "?q=keyword", example: `${baseUrl}/api/pinterest/search?q=landscape` }
        ]
      },
      tools: {
        description: "Audio transcription, security scans, and more",
        endpoints: [
          { method: "GET", path: `${baseUrl}/api/transcribe`, params: "?url=audio_url", example: `${baseUrl}/api/transcribe?url=audio.mp3` },
          { method: "GET", path: `${baseUrl}/api/terabox`, params: "?url=terabox_url", example: `${baseUrl}/api/terabox?url=https://1024terabox.com/s/xxx` },
          { method: "GET", path: `${baseUrl}/api/security/scan`, params: "?domain=website", example: `${baseUrl}/api/security/scan?domain=example.com` },
          { method: "GET", path: `${baseUrl}/api/roblox`, params: "?user=username", example: `${baseUrl}/api/roblox?user=mrbeast` }
        ]
      },
      utility: {
        description: "Utility endpoints",
        endpoints: [
          { method: "GET", path: `${baseUrl}/api/models`, example: `${baseUrl}/api/models`, description: "List all AI models" },
          { method: "GET", path: `${baseUrl}/docs`, example: `${baseUrl}/docs`, description: "This documentation" }
        ]
      }
    },
    response_format: {
      status_code: "HTTP status code",
      creator: "NABEES",
      provider: "NABEES TECH NAIJA DEVOPS",
      country: "Nigeria",
      whatsapp_channel: "https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j",
      timestamp: "Unix timestamp",
      data: "The actual response data"
    }
  };
}

// ==================== HOME PAGE ====================

function getHomePage(request) {
  const baseUrl = getBaseUrl(request);
  const modelsList = Object.keys(CONFIG.CHAT_MODELS);
  
  return {
    service: "Nabees Apis 2.0",
    version: "2.0",
    status: "operational",
    creator: "NABEES",
    provider: "NABEES TECH NAIJA DEVOPS",
    country: "Nigeria",
    whatsapp_channel: "https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j",
    ai_models: {
      total: modelsList.length,
      list: modelsList,
      usage: "GET /api/{model}?q=your+question"
    },
    endpoints: {
      music: [`${baseUrl}/api/spotify`, `${baseUrl}/api/soundcloud`, `${baseUrl}/api/remusic`],
      video: [`${baseUrl}/api/download`, `${baseUrl}/api/instagram`, `${baseUrl}/api/tiktok`, `${baseUrl}/api/movies`],
      image: [`${baseUrl}/api/image/edit`, `${baseUrl}/api/image/upscale`, `${baseUrl}/api/pinterest/search`],
      tools: [`${baseUrl}/api/transcribe`, `${baseUrl}/api/terabox`, `${baseUrl}/api/security/scan`, `${baseUrl}/api/roblox`],
      documentation: `${baseUrl}/docs`
    }
  };
}

// ==================== ROUTE DEFINITIONS ====================

const routes = {
  'GET /api/models': handleModels,
  'GET /api/chat': handleAIChat,
  'GET /api/perplexity': handlePerplexity,
  'GET /api/blackbox': handleBlackbox,
  'GET /api/tongyi': handleTongyi,
  'GET /api/spotify': handleSpotify,
  'GET /api/applemusic': handleAppleMusic,
  'GET /api/soundcloud': handleSoundCloud,
  'GET /api/remusic': handleRemusic,
  'GET /api/soundcloud/dl': handleSoundCloudDL,
  'GET /api/download': handleSaveFrom,
  'GET /api/instagram': handleInstagram,
  'GET /api/tiktok': handleTikTokDownload,
  'GET /api/tiktok/search': handleTikTokSearch,
  'GET /api/tiktok/trending': handleTikTokTrending,
  'GET /api/movies': handleVidboxSearch,
  'GET /api/movies/trending': handleVidboxTrending,
  'GET /api/image/edit': handleDeepAI,
  'GET /api/image/upscale': handleIloveimg,
  'GET /api/pinterest/search': handlePinterestSearch,
  'GET /api/pinterest/pin': handlePinterestPin,
  'GET /api/transcribe': handleTranscribe,
  'GET /api/terabox': handleTerabox,
  'GET /api/security/scan': handleSecurityScan,
  'GET /api/roblox': handleRobloxStalk
};

// ==================== DYNAMIC ROUTE HANDLER ====================

export async function handleRequest(request, url, path) {
  const method = request.method;
  const routeKey = `${method} ${path}`;
  
  // Docs page
  if (path === '/docs' || path === '/api/docs') {
    const docs = getDocsPage(request);
    return jsonResponse(docs);
  }
  
  // Home page
  if (path === '/' || path === '') {
    const home = getHomePage(request);
    return jsonResponse(home);
  }
  
  // Check exact route matches
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
  
  return errorResponse(`Endpoint not found: ${method} ${path}\n\nVisit /docs for API documentation`, 404);
}

// ==================== CORS HANDLER ====================

export function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cookie, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// ==================== EXPORT ====================

export default {
  handleRequest,
  handleOptions
};
