// routes.js - Complete Routes with ALL Services (Full Power)

import { CONFIG } from './config.js';
import { jsonResponse, errorResponse } from './utils.js';

// Import ALL handlers
import {
  handleAIChat,
  handlePerplexity,
  handleBlackbox,
  handleTongyi,
  handleCopilot,
  handleDuckAI,
  handleQuillbot,
  handleAsyntai,
  handleModels
} from './ai.js';

import {
  handleSpotify,
  handleAppleMusic,
  handleSoundCloud,
  handleRemusic,
  handleSoundCloudDL,
  handleSpotifySearch,
  handleSpotifyDownload
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
  handlePinterestPin,
  handleEzRemove,
  handlePhotoEnhancer
} from './image.js';

import {
  handleTranscribe,
  handleTerabox,
  handleSecurityScan,
  handleRobloxStalk,
  handleTranslate,
  handleFaceAge,
  handleMangaHome,
  handleMangaSearch,
  handleMangaDetail,
  handleMangaChapter
} from './tools.js';

// ==================== GET BASE URL ====================

function getBaseUrl(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

// ==================== AI MODELS WITH DESCRIPTIONS & TEST EXAMPLES ====================

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
    service: "Nabees Apis 2.0",
    title: "NABEES AI Gateway API Documentation",
    base_url: baseUrl,
    creator: "NABEES",
    provider: "NABEES TECH NAIJA DEVOPS",
    country: "Nigeria",
    whatsapp_channel: "https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j",
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
      ai_services: {
        description: "Additional AI services",
        endpoints: [
          { method: "GET", path: "/api/perplexity", params: "?q=question&mode=concise", example: `${baseUrl}/api/perplexity?q=Who is president of Indonesia` },
          { method: "GET", path: "/api/blackbox", params: "?q=code&search=true", example: `${baseUrl}/api/blackbox?q=How to reverse array in Python` },
          { method: "GET", path: "/api/tongyi", params: "?q=question", example: `${baseUrl}/api/tongyi?q=Explain AI` },
          { method: "GET", path: "/api/copilot", params: "?q=question&model=default", example: `${baseUrl}/api/copilot?q=Hello` },
          { method: "GET", path: "/api/duckai", params: "?q=question", example: `${baseUrl}/api/duckai?q=What is AI` },
          { method: "GET", path: "/api/quillbot", params: "?q=question", example: `${baseUrl}/api/quillbot?q=Write an essay` },
          { method: "GET", path: "/api/asyntai", params: "?q=question", example: `${baseUrl}/api/asyntai?q=Hello` }
        ]
      },
      music: {
        description: "Search, download and stream music",
        endpoints: [
          { method: "GET", path: "/api/spotify", params: "?q=song+name&limit=5", example: `${baseUrl}/api/spotify?q=Blinding Lights` },
          { method: "GET", path: "/api/spotify/search", params: "?q=song+name", example: `${baseUrl}/api/spotify/search?q=Nina Feast` },
          { method: "GET", path: "/api/spotify/download", params: "?url=spotify_track_url", example: `${baseUrl}/api/spotify/download?url=https://open.spotify.com/track/xxx` },
          { method: "GET", path: "/api/applemusic", params: "?q=song+name&limit=5", example: `${baseUrl}/api/applemusic?q=Love Story` },
          { method: "GET", path: "/api/soundcloud", params: "?q=track+name&limit=5", example: `${baseUrl}/api/soundcloud?q=raindance` },
          { method: "GET", path: "/api/remusic", params: "?q=prompt&styles=Jazz,Chill", example: `${baseUrl}/api/remusic?q=calm piano&styles=Jazz` },
          { method: "GET", path: "/api/soundcloud/dl", params: "?url=soundcloud_url", example: `${baseUrl}/api/soundcloud/dl?url=https://soundcloud.com/artist/track` }
        ]
      },
      video: {
        description: "Download videos and search movies",
        endpoints: [
          { method: "GET", path: "/api/download", params: "?url=video_url", example: `${baseUrl}/api/download?url=https://youtube.com/watch?v=xxx` },
          { method: "GET", path: "/api/instagram", params: "?url=instagram_url", example: `${baseUrl}/api/instagram?url=https://instagram.com/p/xxx` },
          { method: "GET", path: "/api/tiktok", params: "?url=tiktok_url", example: `${baseUrl}/api/tiktok?url=https://tiktok.com/@user/video/xxx` },
          { method: "GET", path: "/api/tiktok/search", params: "?q=keyword&limit=10", example: `${baseUrl}/api/tiktok/search?q=aesthetic` },
          { method: "GET", path: "/api/tiktok/trending", params: "?limit=20", example: `${baseUrl}/api/tiktok/trending` },
          { method: "GET", path: "/api/movies", params: "?q=movie_name&limit=5", example: `${baseUrl}/api/movies?q=transformers` },
          { method: "GET", path: "/api/movies/trending", params: "?type=movie&limit=10", example: `${baseUrl}/api/movies/trending` }
        ]
      },
      image: {
        description: "Edit, upscale, enhance, and search images",
        endpoints: [
          { method: "GET", path: "/api/image/edit", params: "?url=image_url&prompt=edit", example: `${baseUrl}/api/image/edit?url=image.jpg&prompt=cinematic` },
          { method: "GET", path: "/api/image/upscale", params: "?url=image_url&scale=4", example: `${baseUrl}/api/image/upscale?url=image.jpg&scale=4` },
          { method: "GET", path: "/api/image/enhance", params: "?url=image_url&method=1", example: `${baseUrl}/api/image/enhance?url=image.jpg&method=1` },
          { method: "GET", path: "/api/pinterest/search", params: "?q=keyword", example: `${baseUrl}/api/pinterest/search?q=landscape` },
          { method: "GET", path: "/api/pinterest/pin", params: "?id=pin_id", example: `${baseUrl}/api/pinterest/pin?id=123456789` },
          { method: "GET", path: "/api/ezremove", params: "?url=image_url", example: `${baseUrl}/api/ezremove?url=image.jpg` }
        ]
      },
      tools: {
        description: "Audio transcription, translation, security, manga and more",
        endpoints: [
          { method: "GET", path: "/api/transcribe", params: "?url=audio_url", example: `${baseUrl}/api/transcribe?url=audio.mp3` },
          { method: "GET", path: "/api/translate", params: "?text=hello&to=id", example: `${baseUrl}/api/translate?text=Hello&to=id` },
          { method: "GET", path: "/api/faceage", params: "?url=image_url", example: `${baseUrl}/api/faceage?url=face.jpg` },
          { method: "GET", path: "/api/terabox", params: "?url=terabox_url", example: `${baseUrl}/api/terabox?url=https://1024terabox.com/s/xxx` },
          { method: "GET", path: "/api/security/scan", params: "?domain=website", example: `${baseUrl}/api/security/scan?domain=example.com` },
          { method: "GET", path: "/api/roblox", params: "?user=username", example: `${baseUrl}/api/roblox?user=mrbeast` },
          { method: "GET", path: "/api/manga/home", params: "?page=1", example: `${baseUrl}/api/manga/home` },
          { method: "GET", path: "/api/manga/search", params: "?q=naruto&page=1", example: `${baseUrl}/api/manga/search?q=naruto` },
          { method: "GET", path: "/api/manga/detail", params: "?slug=naruto", example: `${baseUrl}/api/manga/detail?slug=naruto` },
          { method: "GET", path: "/api/manga/chapter", params: "?url=chapter_url", example: `${baseUrl}/api/manga/chapter?url=https://mangadistrict.com/chapter/naruto-1` }
        ]
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
    status: "operational",
    creator: "NABEES",
    provider: "NABEES TECH NAIJA DEVOPS",
    country: "Nigeria",
    whatsapp_channel: "https://whatsapp.com/channel/0029VawtjOXJpe8X3j3NCZ3j",
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
    additional_services: {
      description: "Additional services available",
      endpoints: [
        `${baseUrl}/api/perplexity`,
        `${baseUrl}/api/copilot`,
        `${baseUrl}/api/duckai`,
        `${baseUrl}/api/quillbot`,
        `${baseUrl}/api/asyntai`,
        `${baseUrl}/api/spotify`,
        `${baseUrl}/api/spotify/download`,
        `${baseUrl}/api/tiktok`,
        `${baseUrl}/api/translate`,
        `${baseUrl}/api/manga/home`
      ]
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
  'GET /api/copilot': handleCopilot,
  'GET /api/duckai': handleDuckAI,
  'GET /api/quillbot': handleQuillbot,
  'GET /api/asyntai': handleAsyntai,
  
  // Music Routes
  'GET /api/spotify': handleSpotify,
  'GET /api/spotify/search': handleSpotifySearch,
  'GET /api/spotify/download': handleSpotifyDownload,
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
  'GET /api/image/enhance': handlePhotoEnhancer,
  'GET /api/pinterest/search': handlePinterestSearch,
  'GET /api/pinterest/pin': handlePinterestPin,
  'GET /api/ezremove': handleEzRemove,
  
  // Tools Routes
  'GET /api/transcribe': handleTranscribe,
  'GET /api/terabox': handleTerabox,
  'GET /api/security/scan': handleSecurityScan,
  'GET /api/roblox': handleRobloxStalk,
  'GET /api/translate': handleTranslate,
  'GET /api/faceage': handleFaceAge,
  'GET /api/manga/home': handleMangaHome,
  'GET /api/manga/search': handleMangaSearch,
  'GET /api/manga/detail': handleMangaDetail,
  'GET /api/manga/chapter': handleMangaChapter
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
  
  // Dynamic AI model routes (chatday.ai)
  if (method === 'GET' && path.startsWith('/api/')) {
    const modelName = path.slice(5);
    const reservedRoutes = [
      'models', 'chat', 'perplexity', 'blackbox', 'tongyi',
      'copilot', 'duckai', 'quillbot', 'asyntai',
      'spotify', 'spotify/search', 'spotify/download', 'applemusic', 'soundcloud', 'remusic', 'soundcloud/dl',
      'download', 'instagram', 'tiktok', 'tiktok/search', 'tiktok/trending',
      'movies', 'movies/trending',
      'image/edit', 'image/upscale', 'image/enhance', 'pinterest/search', 'pinterest/pin', 'ezremove',
      'transcribe', 'terabox', 'security/scan', 'roblox', 'translate', 'faceage',
      'manga/home', 'manga/search', 'manga/detail', 'manga/chapter',
      'docs'
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
