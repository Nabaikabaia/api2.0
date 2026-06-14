// routes.js - All endpoints working, but docs/home only show AI

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

// ==================== DOCS PAGE (ONLY AI MODELS) ====================

function getDocsPage(request) {
  const baseUrl = getBaseUrl(request);
  
  // Only AI models from chatday (working ones)
  const aiModels = Object.keys(CONFIG.CHAT_MODELS);
  
  return {
    service: "Nabees Apis 2.0",
    title: "NABEES AI Gateway API Documentation",
    base_url: baseUrl,
    creator: "NABEES",
    provider: "NABEES TECH NAIJA DEVOPS",
    country: "Nigeria",
    whatsapp_channel: "https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j",
    endpoints: {
      ai_chat: {
        description: "Chat with 20+ AI models",
        usage: "GET /api/{model}?q=your+question",
        models: aiModels,
        example: `${baseUrl}/api/gpt55?q=Hello world`
      }
    }
  };
}

// ==================== HOME PAGE (ONLY AI) ====================

function getHomePage(request) {
  const baseUrl = getBaseUrl(request);
  const aiModels = Object.keys(CONFIG.CHAT_MODELS);
  
  return {
    service: "Nabees Apis 2.0",
    version: "2.0",
    status: "operational",
    creator: "NABEES",
    provider: "NABEES TECH NAIJA DEVOPS",
    country: "Nigeria",
    whatsapp_channel: "https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j",
    ai_models: {
      total: aiModels.length,
      list: aiModels,
      usage: "GET /api/{model}?q=your+question",
      example: `${baseUrl}/api/gpt55?q=Hello world`
    },
    documentation: `${baseUrl}/docs`
  };
}

// ==================== ROUTES (ALL WORKING, INCLUDING HIDDEN) ====================

const routes = {
  // AI Chat Routes (all work)
  'GET /api/models': handleModels,
  'GET /api/chat': handleAIChat,
  'GET /api/perplexity': handlePerplexity,      // Still works, just hidden from docs
  'GET /api/blackbox': handleBlackbox,          // Still works, just hidden from docs
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

// ==================== DYNAMIC ROUTE HANDLER ====================

export async function handleRequest(request, url, path) {
  const method = request.method;
  const routeKey = `${method} ${path}`;
  
  // Docs page (only shows AI models)
  if (path === '/docs' || path === '/api/docs') {
    return jsonResponse(getDocsPage(request));
  }
  
  // Home page (only shows AI)
  if (path === '/' || path === '') {
    return jsonResponse(getHomePage(request));
  }
  
  // Check exact route matches (ALL work)
  if (routes[routeKey]) {
    return routes[routeKey](request, url);
  }
  
  // Dynamic AI model routes (chatday.ai models)
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
  
  return errorResponse(`Endpoint not found: ${method} ${path}\n\nVisit /docs for available AI models`, 404);
}

// ==================== CORS HANDLER ====================

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
