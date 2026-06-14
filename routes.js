// routes.js - Complete Route Handler for All Services

import { CONFIG } from './config.js';
import {
  randomUUID, randomString,
  jsonResponse, errorResponse,
  sessionManager
} from './utils.js';

// Import all service handlers
import {
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
} from './ai.js';

import {
  spotifySearch,
  appleMusicSearch,
  soundcloudSearch,
  remusicGenerate,
  soundcloudDownload,
  handleSpotify,
  handleAppleMusic,
  handleSoundCloud,
  handleRemusic,
  handleSoundCloudDL
} from './music.js';

import {
  savefromDownload,
  instagramDownload,
  tiktokDownload,
  tiktokSearch,
  tiktokTrending,
  vidboxSearch,
  vidboxTrending,
  handleSaveFrom,
  handleInstagram,
  handleTikTokDownload,
  handleTikTokSearch,
  handleTikTokTrending,
  handleVidboxSearch,
  handleVidboxTrending
} from './video.js';

import {
  deepaiEdit,
  iloveimgUpscale,
  pinterestSearch,
  pinterestPinDetail,
  handleDeepAI,
  handleIloveimg,
  handlePinterestSearch,
  handlePinterestPin
} from './image.js';

import {
  transcribeAudio,
  teraboxDownload,
  shieldnetScan,
  robloxStalk,
  handleTranscribe,
  handleTerabox,
  handleSecurityScan,
  handleRobloxStalk
} from './tools.js';

// ==================== ROUTE DEFINITIONS ====================

const routes = {
  // ========== AI CHAT ROUTES ==========
  'GET /api/models': handleModels,
  'GET /api/chat': handleAIChat,
  'GET /api/perplexity': handlePerplexity,
  'GET /api/blackbox': handleBlackbox,
  'GET /api/tongyi': handleTongyi,
  
  // Dynamic AI model routes (captured separately)
  
  // ========== MUSIC ROUTES ==========
  'GET /api/spotify': handleSpotify,
  'GET /api/applemusic': handleAppleMusic,
  'GET /api/soundcloud': handleSoundCloud,
  'GET /api/remusic': handleRemusic,
  'GET /api/soundcloud/dl': handleSoundCloudDL,
  
  // ========== VIDEO ROUTES ==========
  'GET /api/download': handleSaveFrom,
  'GET /api/instagram': handleInstagram,
  'GET /api/tiktok': handleTikTokDownload,
  'GET /api/tiktok/search': handleTikTokSearch,
  'GET /api/tiktok/trending': handleTikTokTrending,
  'GET /api/movies': handleVidboxSearch,
  'GET /api/movies/trending': handleVidboxTrending,
  
  // ========== IMAGE ROUTES ==========
  'GET /api/image/edit': handleDeepAI,
  'GET /api/image/upscale': handleIloveimg,
  'GET /api/pinterest/search': handlePinterestSearch,
  'GET /api/pinterest/pin': handlePinterestPin,
  
  // ========== TOOLS ROUTES ==========
  'GET /api/transcribe': handleTranscribe,
  'GET /api/terabox': handleTerabox,
  'GET /api/security/scan': handleSecurityScan,
  'GET /api/roblox': handleRobloxStalk
};

// ==================== DYNAMIC ROUTE HANDLER ====================

export async function handleRequest(request, url, path) {
  const method = request.method;
  const routeKey = `${method} ${path}`;
  
  // Check exact route matches
  if (routes[routeKey]) {
    return routes[routeKey](request, url);
  }
  
  // ========== DYNAMIC AI MODEL ROUTES ==========
  // Matches: /api/gpt55, /api/claude-opus, /api/deepseek-pro, etc.
  if (method === 'GET' && path.startsWith('/api/')) {
    const modelName = path.slice(5); // Remove '/api/'
    
    // Check if it's a valid model (not a reserved route)
    const isReservedRoute = [
      'models', 'chat', 'perplexity', 'blackbox', 'tongyi',
      'spotify', 'applemusic', 'soundcloud', 'remusic', 'soundcloud/dl',
      'download', 'instagram', 'tiktok', 'tiktok/search', 'tiktok/trending',
      'movies', 'movies/trending',
      'image/edit', 'image/upscale', 'pinterest/search', 'pinterest/pin',
      'transcribe', 'terabox', 'security/scan', 'roblox'
    ].includes(modelName);
    
    if (!isReservedRoute && (CONFIG.CHAT_MODELS[modelName] || modelName.match(/^[a-zA-Z0-9_-]+$/))) {
      // Reuse handleAIChat for dynamic model routes
      return handleAIChat(request, url);
    }
  }
  
  // ========== HOME PAGE ==========
  if (path === '/' || path === '') {
    return jsonResponse({
      service: 'Nabees AI Gateway',
      version: '3.0',
      status: 'operational',
      endpoints: {
        ai_chat: {
          description: 'Chat with 20+ AI models',
          usage: 'GET /api/{model}?q=your+question',
          models: Object.keys(CONFIG.CHAT_MODELS),
          examples: [
            '/api/gpt55?q=Hello world',
            '/api/claude-opus?q=Tell me a joke',
            '/api/deepseek-pro?q=Explain quantum physics',
            '/api/perplexity?q=Who is the president of Indonesia'
          ]
        },
        music: {
          description: 'Search and stream music',
          endpoints: [
            '/api/spotify?q=song+name',
            '/api/soundcloud?q=track+name',
            '/api/remusic?q=calm+piano&styles=Jazz,Chill'
          ]
        },
        video: {
          description: 'Download videos from social media and search movies',
          endpoints: [
            '/api/download?url=https://youtube.com/watch?v=xxx',
            '/api/instagram?url=https://instagram.com/p/xxx',
            '/api/tiktok?url=https://tiktok.com/@user/video/xxx',
            '/api/movies?q=transformers'
          ]
        },
        image: {
          description: 'Edit, upscale, and search images',
          endpoints: [
            '/api/image/edit?url=image.jpg&prompt=make+it+cinematic',
            '/api/image/upscale?url=image.jpg&scale=4',
            '/api/pinterest/search?q=landscape'
          ]
        },
        tools: {
          description: 'Audio transcription, file downloaders, security scans',
          endpoints: [
            '/api/transcribe?url=audio.mp3',
            '/api/terabox?url=https://1024terabox.com/s/xxx',
            '/api/security/scan?domain=example.com',
            '/api/roblox?user=username'
          ]
        },
        documentation: 'https://github.com/nabees/ai-gateway'
      }
    });
  }
  
  // ========== 404 NOT FOUND ==========
  return errorResponse(`Endpoint not found: ${method} ${path}\n\nAvailable endpoints:\n- GET /api/{model}?q=... (gpt55, claude-opus, deepseek-pro, etc.)\n- GET /api/spotify?q=...\n- GET /api/soundcloud?q=...\n- GET /api/download?url=...\n- GET /api/instagram?url=...\n- GET /api/tiktok?url=...\n- GET /api/movies?q=...\n- GET /api/image/edit?url=...&prompt=...\n- GET /api/pinterest/search?q=...\n- GET /api/transcribe?url=...\n- GET /api/security/scan?domain=...\n- GET /api/roblox?user=...\n- GET /api/models (list all AI models)`, 404);
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
