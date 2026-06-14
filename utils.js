// routes.js - Updated with only working AI endpoints visible

import { CONFIG } from './config.js';
import { jsonResponse, errorResponse } from './utils.js';

// Import all service handlers (keep all, just hide from docs)
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

// ==================== DOCS PAGE (ONLY WORKING AI ENDPOINTS) ====================

function getDocsPage(request) {
  const baseUrl = getBaseUrl(request);
  
  // Only working AI models (chatday.ai models)
  const workingModels = [
    'gpt55', 'gpt54', 'gpt53chat', 'gpt51instant', 'gpt5', 'gpt4o', 'gpt4omini',
    'claude-opus', 'claude-opus-47', 'claude-opus-46', 'claude-opus-45',
    'claude-sonnet', 'claude-haiku', 'claude-fable',
    'deepseek-pro', 'deepseek-flash', 'deepseek-thinking',
    'gemini-pro', 'gemini-3-pro', 'gemini-flash',
    'grok', 'llama', 'qwen', 'kimi'
  ];
  
  const workingExamples = workingModels.map(model => ({
    endpoint: `${baseUrl}/api/${model}?q=Hello world`,
    description: `${model.toUpperCase()} - AI Chat`
  }));
  
  return {
    service: "Nabees Apis 2.0",
    title: "NABEES AI Gateway API Documentation",
    description: "Complete API Gateway for AI Chat (20+ models)",
    base_url: baseUrl,
    creator: "NABEES",
    provider: "NABEES TECH NAIJA DEVOPS",
    country: "Nigeria",
    whatsapp_channel: "https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j",
    endpoints: {
      ai_chat: {
        description: "Chat with 20+ AI models",
        total_models: workingModels.length,
        usage: "GET /api/{model}?q=your+question",
        models: workingModels,
        examples: workingExamples.slice(0, 10) // Show first 10 examples
      },
      utility: {
        description: "Utility endpoints",
        endpoints: [
          { method: "GET", path: `${baseUrl}/api/models`, example: `${baseUrl}/api/models`, description: "List all available AI models" },
          { method: "GET", path: `${baseUrl}/docs`, example: `${baseUrl}/docs`, description: "This documentation page" }
        ]
      }
    },
    note: "All responses are automatically formatted with pretty JSON (2-space indentation)"
  };
}

// ==================== HOME PAGE (ONLY WORKING AI ENDPOINTS) ====================

function getHomePage(request) {
  const baseUrl = getBaseUrl(request);
  
  const workingModels = [
    'gpt55', 'gpt54', 'gpt4o', 'claude-opus', 'claude-sonnet', 'claude-haiku',
    'deepseek-pro', 'deepseek-flash', 'gemini-pro', 'grok', 'llama', 'qwen', 'kimi'
  ];
  
  return {
    service: "Nabees Apis 2.0",
    version: "2.0",
    status: "operational",
    creator: "NABEES",
    provider: "NABEES TECH NAIJA DEVOPS",
    country: "Nigeria",
    whatsapp_channel: "https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j",
    ai_models: {
      total: workingModels.length,
      list: workingModels,
      usage: "GET /api/{model}?q=your+question",
      example: `${baseUrl}/api/gpt55?q=Hello world`
    },
    documentation: `${baseUrl}/docs`
  };
}

// ==================== ROUTE DEFINITIONS ====================

const routes = {
  // AI Chat Routes (Working)
  'GET /api/models': handleModels,
  'GET /api/chat': handleAIChat,
  'GET /api/tongyi': handleTongyi,
  
  // Hidden but functional endpoints (not in docs)
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
  
  // Docs page (clean, only working AI)
  if (path === '/docs' || path === '/api/docs') {
    const docs = getDocsPage(request);
    return jsonResponse(docs);
  }
  
  // Home page (clean, only working AI)
  if (path === '/' || path === '') {
    const home = getHomePage(request);
    return jsonResponse(home);
  }
  
  // Check exact route matches (all hidden endpoints still work)
  if (routes[routeKey]) {
    return routes[routeKey](request, url);
  }
  
  // Dynamic AI model routes (working)
  if (method === 'GET' && path.startsWith('/api/')) {
    const modelName = path.slice(5);
    const reservedRoutes = [
      'models', 'chat', 'tongyi',
      'spotify', 'applemusic', 'soundcloud', 'remusic', 'soundcloud/dl',
      'download', 'instagram', 'tiktok', 'tiktok/search', 'tiktok/trending',
      'movies', 'movies/trending',
      'image/edit', 'image/upscale', 'pinterest/search', 'pinterest/pin',
      'transcribe', 'terabox', 'security/scan', 'roblox', 'docs', 'perplexity', 'blackbox'
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
