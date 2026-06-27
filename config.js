// config.js - COMPLETE CONFIGURATION FOR ALL SERVICES

export const CONFIG = {
  // ==================== USER AGENTS ====================
  UA_MOBILE: "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  UA_DESKTOP: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0",
  UA_IOS: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  
  // ==================== ALL AI MODELS (chatday.ai) ====================
  CHAT_MODELS: {
    'gpt55': 'openai/gpt-5.5',
    'gpt54': 'openai/gpt-5.4',
    'gpt53chat': 'openai/gpt-5.3-chat',
    'gpt51instant': 'openai/gpt-5.1-instant',
    'gpt5': 'openai/gpt-5',
    'gpt4o': 'openai/gpt-4o',
    'gpt4omini': 'openai/gpt-4o-mini',
    'claude-opus': 'anthropic/claude-opus-4.8',
    'claude-opus-47': 'anthropic/claude-opus-4.7',
    'claude-opus-46': 'anthropic/claude-opus-4.6',
    'claude-opus-45': 'anthropic/claude-opus-4.5',
    'claude-sonnet': 'anthropic/claude-sonnet-4.6',
    'claude-haiku': 'anthropic/claude-haiku-4.5',
    'claude-fable': 'anthropic/claude-fable-5',
    'deepseek-pro': 'deepseek/deepseek-v4-pro',
    'deepseek-flash': 'deepseek/deepseek-v4-flash',
    'deepseek-thinking': 'deepseek/deepseek-v3.2-thinking',
    'gemini-pro': 'google/gemini-3.1-pro-preview',
    'gemini-3-pro': 'google/gemini-3-pro-preview',
    'gemini-flash': 'google/gemini-3.1-flash-lite',
    'grok': 'xai/grok-4.1-fast-non-reasoning',
    'llama': 'meta/llama-4-maverick',
    'qwen': 'alibaba/qwen3-max',
    'kimi': 'moonshotai/kimi-k2.6'
  },
  
  // Reverse mapping for bot_id to model name
  BOT_TO_MODEL: {
    '25871': 'llama',
    '25872': 'unknown',
    '25873': 'deepseek',
    '25874': 'gemini',
    '25875': 'claude'
  },
  
  // ==================== ALL API ENDPOINTS ====================
  ENDPOINTS: {
    // AI Chat
    CHATDAY: "https://www.chatday.ai",
    BLACKBOX: "https://app.blackbox.ai",
    TONGYI: "https://api.tongyi.com",
    PERPLEXITY: "https://www.perplexity.ai",
    GEMINI: "https://gemini.google.com",
    
    // Music
    SPOTIFY_API: "https://api-partner.spotify.com",
    SPOTIFY_OPEN: "https://open.spotify.com",
    APPLE_MUSIC: "https://amp-api-edge.music.apple.com",
    APPLE_MUSIC_WEB: "https://music.apple.com",
    SOUNDCLOUD_API: "https://api-v2.soundcloud.com",
    SOUNDCLOUD_WEB: "https://soundcloud.com",
    SOUNDCLOUD_DL: "https://downcloudme.com",
    REMUSIC_API: "https://remusic.ai/api/v1/ai-music/music",
    REMUSIC_WEB: "https://remusic.ai",
    
    // Video Downloaders
    SAVEFROM: "https://en1.savefrom.net",
    SAVEFROM_WORKER: "https://worker.savefrom.net",
    INSTAGRAM: "https://igram.world",
    INSTAGRAM_API: "https://api-wh.igram.world",
    TIKWM: "https://www.tikwm.com",
    TIKTOK: "https://www.tiktok.com",
    
    // Image Tools
    DEEPAI: "https://api.deepai.org/api/image-editor",
    DEEPAI_WEB: "https://deepai.org",
    ILOVEIMG: "https://api.iloveimg.com/v1",
    ILOVEIMG_WEB: "https://www.iloveimg.com",
    PINTEREST: "https://id.pinterest.com",
    PINTEREST_API: "https://id.pinterest.com/resource/BaseSearchResource/get/",
    
    // Audio Tools
    TRANSCRIBE_API: "https://api.audiotranscriber.io",
    TRANSCRIBE_WEB: "https://audiotranscriber.io",
    OCR_SPACE: "https://api.ocr.space/parse/image",
    
    // Security
    SHIELDNET: "https://www.shieldnet.app",
    SHIELDNET_API: "https://www.shieldnet.app/api",
    
    // Downloaders
    TERABOX: "https://1024teradownloader.com",
    TERABOX_API: "https://1024teradownloader.com/api/stream",
    UGUU: "https://uguu.se/upload",
    CATBOX: "https://catbox.moe/user/api.php",
    
    // Streaming
    TMDB: "https://api.themoviedb.org/3",
    TMDB_IMAGE: "https://image.tmdb.org/t/p",
    VIDBOX_PROXY: "https://vidbox.pages.dev",
    
    // Gaming
    ROBLOX_USERS: "https://users.roblox.com/v1",
    ROBLOX_FRIENDS: "https://friends.roblox.com/v1",
    ROBLOX_GROUPS: "https://groups.roblox.com/v2",
    ROBLOX_BADGES: "https://badges.roblox.com/v1",
    ROBLOX_PRESENCE: "https://presence.roblox.com/v1",
    ROBLOX_AVATAR: "https://avatar.roblox.com/v1",
    ROBLOX_GAMES: "https://games.roblox.com/v2"
  },
  
  // ==================== COMPLETE STREAMING SERVERS (40+ SERVERS) ====================
  STREAMING_SERVERS: [
    { name: "V2", flag: "GB", url: "https://player2.vidplus.pro/embed/movie/{id}?autoplay=true" },
    { name: "Premium", flag: "US", url: "https://player.vidplus.to/embed/movie/{id}?autoplay=true&download=true" },
    { name: "4K", flag: "GB", url: "https://player.videasy.net/movie/{id}" },
    { name: "Max", flag: "US", url: "https://ythd.org/embed/{id}" },
    { name: "Vidfast", flag: "GB", url: "https://vidfast.pro/movie/{id}?autoplay=true" },
    { name: "Vidpro", flag: "GB", url: "https://vixsrc.to/movie/{id}" },
    { name: "Nxsha", flag: "US", url: "https://web.nxsha.app/embed/movie/{id}?lang=en&autoplay=true&sub=en" },
    { name: "Atlas", flag: "US", url: "https://vidsrc.cc/v2/embed/movie/{id}" },
    { name: "Vidsrc", flag: "US", url: "https://vidsrc.tw/embed/movie/{id}?referrer=none" },
    { name: "2Embed", flag: "AU", url: "https://2embed.stream/embed/movie/{id}" },
    { name: "Cinemaos", flag: "US", url: "https://cinemaos.tech/player/{id}" },
    { name: "Prime", flag: "US", url: "https://web.nxsha.app/embed/movie/{id}?lang=en&autoplay=true&one_server=true&server=OrVid-[Multi-Lang]" },
    { name: "Netflix", flag: "US", url: "https://web.nxsha.app/embed/movie/{id}?lang=en&autoplay=true&one_server=true&server=ZetPly-[Multi-Lang]" },
    { name: "Hotstar", flag: "US", url: "https://web.nxsha.app/embed/movie/{id}?lang=en&autoplay=true&one_server=true&server=QsPly-[Multi-Lang]" },
    { name: "Vidnest", flag: "GB", url: "https://vidnest.fun/movie/{id}" },
    { name: "Tongo", flag: "US", url: "https://www.NontonGo.win/embed/movie/{id}" },
    { name: "Echo", flag: "US", url: "https://vidlink.pro/movie/{id}?primaryColor=white&secondaryColor=white&iconColor=white&title=false&poster=true&autoplay=true" },
    { name: "Drive", flag: "GB", url: "https://godriveplayer.com/player.php?imdb={imdb}" },
    { name: "NHD", flag: "IN", url: "https://nhdapi.com/embed/movie/{id}?autoplay=true&autonext=true&audio=true&title=true&download=true" },
    { name: "Asia", flag: "IN", url: "https://player.autoembed.app/embed/movie/{imdb}?server=2" },
    { name: "Bravo", flag: "GB", url: "https://moviesapi.club/movie/{id}" },
    { name: "Vidking", flag: "US", url: "https://www.vidking.net/embed/movie/{id}?autoplay=true" },
    { name: "Rip", flag: "GB", url: "https://vidsrc.rip/embed/movie/{id}" },
    { name: "Spencer", flag: "US", url: "https://spencerdevs.xyz/movie/{id}" },
    { name: "Lima", flag: "US", url: "https://vidsrc.vip/embed/movie/{id}" },
    { name: "111", flag: "GB", url: "https://111movies.com/movie/{id}" },
    { name: "Jade", flag: "PT", url: "https://superflixapi.digital/filme/{id}" },
    { name: "French", flag: "FR", url: "https://frembed.work/api/film.php?id={id}" },
    { name: "Spanish", flag: "ES", url: "https://web.nxsha.app/embed/movie/{id}?lang=es&autoplay=true&sub=es" },
    { name: "Hindi", flag: "IN", url: "https://web.nxsha.app/embed/movie/{id}?lang=hindi&autoplay=true" },
    { name: "Tamil", flag: "IN", url: "https://web.nxsha.app/embed/movie/{id}?lang=tamil&autoplay=true" },
    { name: "Telugu", flag: "IN", url: "https://web.nxsha.app/embed/movie/{id}?lang=telugu&autoplay=true" },
    { name: "Arab", flag: "SA", url: "https://web.nxsha.app/embed/movie/{id}?lang=ar&autoplay=true&sub=ar" },
    { name: "Brazil", flag: "BR", url: "https://web.nxsha.app/embed/movie/{id}?lang=pt&autoplay=true&sub=pt" },
    { name: "Rus", flag: "RU", url: "https://web.nxsha.app/embed/movie/{id}?lang=ru&autoplay=true&sub=ru" },
    { name: "German", flag: "DE", url: "https://web.nxsha.app/embed/movie/{id}?lang=de&autoplay=true&sub=de" },
    { name: "Italy", flag: "IT", url: "https://vixsrc.to/movie/{id}?lang=it" },
    { name: "Japan", flag: "JP", url: "https://web.nxsha.app/embed/movie/{id}?lang=ja&autoplay=true&sub=ja" },
    { name: "Turkish", flag: "TR", url: "https://web.nxsha.app/embed/movie/{id}?lang=tr&autoplay=true&sub=tr" },
    { name: "Rive", flag: "GB", url: "https://rivestream.net/embed?type=movie&id={id}" },
    { name: "Flicky", flag: "IN", url: "https://flicky.host/embed/movie/?id={id}" },
    { name: "Peachify", flag: "US", url: "https://peachify.top/embed/movie/{id}?autoplay=true&sub=English" }
  ],
  
  // ==================== PRESENCE TYPES (ROBLOX) ====================
  ROBLOX_PRESENCE_TYPES: {
    0: "Offline",
    1: "Online (Website)",
    2: "In Game",
    3: "In Studio",
    4: "Invisible"
  },
  
  // ==================== MIME TYPES ====================
  MIME_TYPES: {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    webm: "audio/webm"
  },
  
  // ==================== SOUNDCLOUD FORMATS ====================
  SOUNDCLOUD_QUALITY: {
    progressive: "progressive",
    hls: "hls"
  },
  
  // ==================== DEEPAI CONFIG ====================
  DEEPAI_AGENT: "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36",
  DEEPAI_SALT: "hackers_become_a_little_stinkier_every_time_they_hack",
  DEEPAI_APP_ID: "pixnova",
  DEEPAI_THEME: "83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q",
  
  // ==================== APPLE MUSIC REGIONS ====================
  APPLE_MUSIC_REGIONS: ["id", "us", "gb", "jp", "kr", "fr", "de", "br", "au", "ca"],
  
  // ==================== OCR SPACE KEYS ====================
  OCR_SPACE_KEYS: ["helloworld", "K81634588988957", "K87899142388957"],
  
  // ==================== SPOTIFY CONFIG ====================
  SPOTIFY_SECRET: "376136387538459893883312310911992847112448894410210511297108",
  SPOTIFY_TOTP_VERSION: 61,
  SPOTIFY_APP_VERSION: "1.2.92.50.g97692e81",
  
  // ==================== SHIELDNET CONFIG ====================
  SHIELDNET_THEME: "83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q",
  
  // ==================== FALLBACKS & KEYS ====================
  FALLBACKS: {
    SOUNDCLOUD_CLIENT_ID: "KKzJxmw11tYpCs6T24P4uUYhqmjalG6M",
    TMDB_API_KEY: "cc62b52e2d5f4ea112a698f20c090b13",
    BLACKBOX_FALLBACK_VALIDATED: "a38f5889-8fef-46d4-8ede-bf4668b6a9bb"
  },
  
  // ==================== REQUEST LIMITS ====================
  LIMITS: {
    MAX_RETRIES: 6,
    MAX_POLL_ATTEMPTS: 70,
    POLL_INTERVAL_MS: 5000,
    DEFAULT_SEARCH_LIMIT: 5,
    MAX_SEARCH_LIMIT: 20,
    CACHE_TTL_MS: 300000,
    SESSION_TTL_MS: 3600000
  }
};
