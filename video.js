// video.js - Complete Video Services
// Services: SaveFrom (Universal), Instagram, TikTok, Vidbox Movies

import { CONFIG } from './config.js';
import {
  randomUUID, randomString, randomIP,
  parseSSE, sleep, fetchWithRetry,
  sessionManager, buildHeaders, buildMobileHeaders,
  jsonResponse, errorResponse
} from './utils.js';

// ==================== SAVEFROM.NET (UNIVERSAL VIDEO DOWNLOADER) ====================
// Supports: YouTube, TikTok, Instagram, Facebook, Twitter, Twitter, etc.

export async function savefromDownload(url) {
  try {
    // Get initial page and cookies
    const homeRes = await fetch(CONFIG.ENDPOINTS.SAVEFROM + "/", {
      headers: buildHeaders({ 'Accept': 'text/html' })
    });
    const html = await homeRes.text();
    const cookies = homeRes.headers.getSetCookie?.()?.map(c => c.split(';')[0]).join('; ') || '';
    
    // Extract nonce/validation token
    const nonceMatch = html.match(/name="csrf_token"\s+value="([^"]+)"/);
    const nonce = nonceMatch ? nonceMatch[1] : '';
    
    // Build form data
    const formData = new URLSearchParams();
    formData.append('sf_url', url);
    formData.append('sf_submit', '');
    formData.append('new', '2');
    formData.append('lang', 'en');
    formData.append('app', '');
    formData.append('country', 'us');
    formData.append('os', 'Windows');
    formData.append('browser', 'Chrome');
    formData.append('channel', 'main');
    formData.append('sf-nomad', '1');
    formData.append('ts', Date.now());
    if (nonce) formData.append('csrf_token', nonce);
    
    // Make request to worker endpoint
    const res = await fetch(CONFIG.ENDPOINTS.SAVEFROM_WORKER + "/savefrom.php", {
      method: "POST",
      headers: {
        ...buildHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        'Origin': CONFIG.ENDPOINTS.SAVEFROM,
        'Referer': CONFIG.ENDPOINTS.SAVEFROM + "/"
      },
      body: formData.toString()
    });
    
    const result = await res.text();
    
    // Parse JSON response
    if (result.includes('#json#')) {
      const jsonMatch = result.match(/#json#([\s\S]+?)#json#/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        
        if (data.success === false) {
          return { error: data.html?.replace(/<[^>]+>/g, '') || 'Download failed' };
        }
        
        const media = (data.url || []).map(m => ({
          url: m.url,
          quality: m.quality || m.subname,
          type: m.type || 'video',
          ext: m.ext || 'mp4',
          size: m.size || null
        }));
        
        return {
          success: true,
          title: data.meta?.title || data.title,
          duration: data.duration,
          thumbnail: data.thumb,
          media: media,
          provider: 'savefrom'
        };
      }
    }
    
    // Parse HTML response as fallback
    const media = [];
    const urlMatches = result.match(/data-direct="([^"]+)"/g);
    if (urlMatches) {
      for (const match of urlMatches) {
        const videoUrl = match.match(/data-direct="([^"]+)"/)[1];
        media.push({ url: videoUrl, quality: 'HD', type: 'video' });
      }
    }
    
    if (media.length === 0) {
      return { error: 'No download links found' };
    }
    
    return {
      success: true,
      media: media,
      provider: 'savefrom'
    };
    
  } catch (error) {
    return { error: error.message, provider: 'savefrom' };
  }
}

// ==================== INSTAGRAM DOWNLOADER ====================

export async function instagramDownload(url) {
  try {
    // Get initial page
    const homeRes = await fetch(CONFIG.ENDPOINTS.INSTAGRAM + "/en1/", {
      headers: buildMobileHeaders({ 'Accept': 'text/html' })
    });
    const html = await homeRes.text();
    const cookies = homeRes.headers.getSetCookie?.()?.map(c => c.split(';')[0]).join('; ') || '';
    
    // Detect content type
    let endpoint, body;
    if (url.includes('/reel/') || url.includes('/p/') || url.includes('/tv/')) {
      endpoint = "/api/convert";
      body = { target_url: url };
    } else if (url.includes('/stories/')) {
      endpoint = "/api/v1/instagram/story";
      body = { url: url };
    } else {
      const username = url.match(/instagram\.com\/([^\/?]+)/)?.[1];
      if (!username) return { error: 'Invalid Instagram URL' };
      endpoint = "/api/v1/instagram/profile";
      body = { username: username };
    }
    
    // Make request
    const res = await fetch(CONFIG.ENDPOINTS.INSTAGRAM_API + endpoint, {
      method: "POST",
      headers: {
        ...buildMobileHeaders(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    
    if (data.code === "CAPTCHA_REQUIRED") {
      return { error: 'Captcha required. Try again later.', captcha: true };
    }
    
    // Parse media
    const media = [];
    
    if (data.url) {
      const urls = Array.isArray(data.url) ? data.url : [data.url];
      for (const item of urls) {
        if (item.url || item.href) {
          media.push({
            url: item.url || item.href,
            type: item.type || item.ext || (item.url?.includes('.mp4') ? 'video' : 'image'),
            quality: item.quality || item.subname
          });
        }
      }
    }
    
    if (data.result && Array.isArray(data.result)) {
      for (const item of data.result) {
        if (item.video_versions?.length) {
          media.push({ url: item.video_versions[0].url, type: 'video' });
        } else if (item.image_versions2?.candidates?.length) {
          media.push({ url: item.image_versions2.candidates[0].url, type: 'image' });
        }
      }
    }
    
    if (media.length === 0) {
      return { error: 'No media found' };
    }
    
    return {
      success: true,
      media: media,
      username: data.username || data.result?.[0]?.user?.username,
      type: endpoint === "/api/convert" ? (url.includes('/reel/') ? 'reel' : 'post') : (endpoint.includes('story') ? 'story' : 'profile'),
      provider: 'instagram'
    };
    
  } catch (error) {
    return { error: error.message, provider: 'instagram' };
  }
}

// ==================== TIKTOK VIDEO DOWNLOADER ====================

export async function tiktokDownload(url) {
  try {
    // Use tikwm API
    const res = await fetch(`${CONFIG.ENDPOINTS.TIKWM}/api/video`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': CONFIG.UA_MOBILE,
        'Referer': 'https://www.tikwm.com/',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({ url: url, hd: '1' })
    });
    
    const rawText = await res.text();
    
    // tikwm sometimes returns HTML when IP is rate-limited; fall back to douyin.wtf
    if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
      return await tiktokDownloadMusicaldown(url);
    }
    
    let data;
    try { data = JSON.parse(rawText); } catch { return await tiktokDownloadMusicaldown(url); }
    
    if (data.code !== 0 || !data.data) {
      return await tiktokDownloadMusicaldown(url);
    }
    
    const video = data.data;
    
    return {
      success: true,
      id: video.id,
      title: video.title,
      description: video.description,
      duration: video.duration,
      cover: video.cover,
      origin_cover: video.origin_cover,
      dynamic_cover: video.dynamic_cover,
      music: {
        id: video.music_info?.id,
        title: video.music_info?.title,
        author: video.music_info?.author,
        duration: video.music_info?.duration,
        cover: video.music_info?.cover,
        url: video.music
      },
      author: {
        id: video.author?.id,
        username: video.author?.unique_id,
        nickname: video.author?.nickname,
        avatar: video.author?.avatar,
        signature: video.author?.signature
      },
      statistics: {
        play_count: video.play_count,
        digg_count: video.digg_count,
        comment_count: video.comment_count,
        share_count: video.share_count,
        download_count: video.download_count
      },
      videos: {
        no_watermark: video.play,
        watermark: video.wmplay,
        hd: video.hdplay
      },
      provider: 'tikwm'
    };
    
  } catch (error) {
    return { error: error.message, provider: 'tikwm' };
  }
}



// ==================== TIKTOK DOWNLOAD via musicaldown.com ====================
async function tiktokDownloadMusicaldown(url) {
  try {
    const homeRes = await fetch('https://musicaldown.com/en', {
      headers: {
        'User-Agent': CONFIG.UA_DESKTOP,
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const homeHtml = await homeRes.text();
    const cookies = homeRes.headers.getSetCookie?.()?.map(c => c.split(';')[0]).join('; ') || '';

    // Extract URL input field name (id="link_url" text input - name changes per deployment)
    const urlFieldMatch = homeHtml.match(/name="([^"]+)"[^>]+id="link_url"/i)
                       || homeHtml.match(/id="link_url"[^>]+name="([^"]+)"/i);
    if (!urlFieldMatch) return { error: 'musicaldown: url field not found', provider: 'musicaldown' };
    const urlFieldName = urlFieldMatch[1];

    // Extract CSRF-like hidden token (name and value both change per session)
    const tokenMatch = homeHtml.match(/name="([^"]+)"\s+type="hidden"\s+value="([a-f0-9]{28,})"/i)
                    || homeHtml.match(/type="hidden"\s+name="([^"]+)"\s+value="([a-f0-9]{28,})"/i);
    if (!tokenMatch) return { error: 'musicaldown: csrf token not found', provider: 'musicaldown' };
    const [, tokenName, tokenValue] = tokenMatch;

    const form = new URLSearchParams({
      [urlFieldName]: url,
      [tokenName]: tokenValue,
      verify: '1'
    });

    const dlRes = await fetch('https://musicaldown.com/download', {
      method: 'POST',
      headers: {
        'User-Agent': CONFIG.UA_DESKTOP,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://musicaldown.com/en',
        'Origin': 'https://musicaldown.com',
        'Cookie': cookies
      },
      body: form.toString()
    });

    const html = await dlRes.text();
    if (!html || html.length < 100) {
      return { error: 'musicaldown: empty download response', provider: 'musicaldown' };
    }

    // Extract download links - musicaldown uses <a> tags with video CDN URLs
    const allLinksRe = new RegExp('href="(https://[^"]{30,})"', 'g');
    const allLinks = [...html.matchAll(allLinksRe)].map(m => m[1])
      .filter(l => /(?:tiktok|muscdn|tikcdn|v19|v16|v[0-9]+-webapp|akamai|ttwcdn|byteimg|pstatp|snssdk|amemv)/.test(l));

    // Also check data-url attributes
    const dataUrlRe = new RegExp('data-url="(https://[^"]+)"', 'g');
    const dataUrls = [...html.matchAll(dataUrlRe)].map(m => m[1]);

    const videoLinks = [...allLinks, ...dataUrls].filter(Boolean);

    const titleRe = new RegExp('<h2[^>]*>([^<]{3,120})<\/h2>', 'i');
    const authorRe = new RegExp('<h4[^>]*>([^<]{2,60})<\/h4>', 'i');
    const titleMatch = html.match(titleRe);
    const authorMatch = html.match(authorRe);

    if (!videoLinks.length) {
      return { error: 'musicaldown: no video links in response', provider: 'musicaldown' };
    }

    return {
      success: true,
      title: titleMatch?.[1]?.trim() || null,
      author: { username: authorMatch?.[1]?.trim() || null },
      videos: {
        no_watermark: videoLinks[0] || null,
        with_watermark: videoLinks[1] || null
      },
      provider: 'musicaldown'
    };
  } catch (error) {
    return { error: error.message, provider: 'musicaldown' };
  }
}



// ==================== TIKTOK DOWNLOAD FALLBACK (douyin.wtf) ====================

async function tiktokDownloadFallback(url) {
  try {
    const res = await fetch(`https://api.douyin.wtf/api/hybrid/video_data?url=${encodeURIComponent(url)}&minimal=false`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    const data = await res.json();
    const v = data?.aweme_detail;
    if (!v) return { error: 'TikTok download failed — video may be private or deleted', provider: 'fallback' };
    return {
      success: true,
      id: v.aweme_id,
      title: v.desc,
      duration: v.video?.duration,
      cover: v.video?.cover?.url_list?.[0],
      music: {
        title: v.music?.title,
        author: v.music?.author,
        url: v.music?.play_url?.url_list?.[0]
      },
      author: {
        username: v.author?.unique_id || v.author?.uid,
        nickname: v.author?.nickname,
        avatar: v.author?.avatar_thumb?.url_list?.[0]
      },
      statistics: {
        play_count: v.statistics?.play_count,
        digg_count: v.statistics?.digg_count,
        comment_count: v.statistics?.comment_count,
        share_count: v.statistics?.share_count
      },
      videos: {
        no_watermark: v.video?.play_addr?.url_list?.[0],
        watermark: v.video?.download_addr?.url_list?.[0],
        hd: v.video?.bit_rate?.[0]?.play_addr?.url_list?.[0]
      },
      provider: 'douyin.wtf'
    };
  } catch (error) {
    return { error: error.message, provider: 'fallback' };
  }
}

// ==================== TIKTOK SEARCH ====================

export async function tiktokSearch(query, limit = 10, cursor = 0) {
  try {
    const res = await fetch(`${CONFIG.ENDPOINTS.TIKWM}/api/feed/search?keywords=${encodeURIComponent(query)}&count=${limit}&cursor=${cursor}&hd=1`, {
      headers: {
        'User-Agent': CONFIG.UA_MOBILE,
        'Referer': 'https://www.tikwm.com/',
        'Accept': 'application/json'
      }
    });
    
    const data = await res.json();
    
    if (data.code !== 0 || !data.data?.videos) {
      return { error: data.msg || 'Search failed', results: [] };
    }
    
    const results = data.data.videos.map(v => ({
      id: v.video_id,
      title: v.title,
      duration: v.duration,
      cover: v.cover,
      origin_cover: v.origin_cover,
      play_count: v.play_count,
      digg_count: v.digg_count,
      comment_count: v.comment_count,
      share_count: v.share_count,
      author: {
        username: v.author?.unique_id,
        nickname: v.author?.nickname,
        avatar: v.author?.avatar
      },
      music: {
        title: v.music_info?.title,
        author: v.music_info?.author
      },
      video_url: v.play,
      video_url_hd: v.hdplay,
      video_url_watermark: v.wmplay,
      created_at: v.create_time
    }));
    
    return {
      success: true,
      query: query,
      count: results.length,
      cursor: data.data.cursor,
      has_more: !!data.data.hasMore,
      results: results,
      provider: 'tikwm'
    };
    
  } catch (error) {
    return { error: error.message, results: [], provider: 'tikwm' };
  }
}

// ==================== TIKTOK TRENDING ====================

export async function tiktokTrending(limit = 20) {
  try {
    const res = await fetch(`https://www.tikwm.com/api/feed/list?count=${limit}&region=ID`, {
      headers: {
        'User-Agent': CONFIG.UA_MOBILE,
        'Referer': 'https://www.tikwm.com/'
      }
    });
    
    const data = await res.json();
    
    if (data.code !== 0 || !Array.isArray(data.data) || data.data.length === 0) {
      return { error: data.msg || 'Failed to fetch trending', results: [] };
    }
    
    const results = data.data.map(v => ({
      id: v.video_id,
      title: v.title,
      duration: v.duration,
      cover: v.cover,
      play_count: v.play_count,
      digg_count: v.digg_count,
      comment_count: v.comment_count,
      share_count: v.share_count,
      author: {
        username: v.author?.unique_id,
        nickname: v.author?.nickname,
        avatar: v.author?.avatar
      },
      video_url: v.play,
      video_url_hd: v.hdplay
    }));
    
    return {
      success: true,
      count: results.length,
      results: results,
      provider: 'tikwm'
    };
    
  } catch (error) {
    return { error: error.message, results: [] };
  }
}

// ==================== VIDBOX MOVIE/TV SEARCH ====================

export async function vidboxSearch(query, options = {}) {
  const { limit = 5, season = 1, episode = 1 } = options;
  
  try {
    const TMDB_KEY = CONFIG.FALLBACKS.TMDB_API_KEY;
    
    // Search TMDB
    const searchRes = await fetch(`${CONFIG.ENDPOINTS.TMDB}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`, {
      headers: { 'User-Agent': CONFIG.UA_DESKTOP }
    });
    
    const data = await searchRes.json();
    const results = (data.results || [])
      .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, limit);
    
    const enriched = await Promise.all(results.map(async (r) => {
      const mediaType = r.media_type;
      
      // Get external IDs for IMDB
      let imdbId = null;
      try {
        const extRes = await fetch(`${CONFIG.ENDPOINTS.TMDB}/${mediaType}/${r.id}/external_ids?api_key=${TMDB_KEY}`);
        const extData = await extRes.json();
        imdbId = extData.imdb_id;
      } catch {}
      
      // Build streaming server URLs
      const servers = CONFIG.STREAMING_SERVERS.map(server => {
        let url = server.url.replace('{id}', r.id);
        if (imdbId) url = url.replace('{imdb}', imdbId);
        
        if (mediaType === 'tv') {
          url = url.replace('/movie/', '/tv/')
                     .replace('type=movie', 'type=tv');
          url = url.includes('{season}') 
            ? url.replace('{season}', season).replace('{episode}', episode)
            : `${url}/${season}/${episode}`;
        }
        
        return {
          name: server.name,
          flag: server.flag,
          url: url
        };
      });
      
      return {
        id: r.id,
        type: mediaType,
        title: r.title || r.name,
        original_title: r.original_title || r.original_name,
        year: (r.release_date || r.first_air_date || '').slice(0, 4),
        description: r.overview,
        rating: r.vote_average,
        vote_count: r.vote_count,
        popularity: r.popularity,
        imdb_id: imdbId,
        poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
        backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/original${r.backdrop_path}` : null,
        embed_url: servers[0]?.url,
        servers: servers
      };
    }));
    
    return {
      success: true,
      query: query,
      count: enriched.length,
      results: enriched,
      provider: 'vidbox'
    };
    
  } catch (error) {
    return { error: error.message, results: [], provider: 'vidbox' };
  }
}

// ==================== VIDBOX TRENDING MOVIES ====================

export async function vidboxTrending(type = 'movie', limit = 10) {
  try {
    const TMDB_KEY = CONFIG.FALLBACKS.TMDB_API_KEY;
    const endpoint = type === 'movie' ? 'trending/movie/week' : 'trending/tv/week';
    
    const res = await fetch(`${CONFIG.ENDPOINTS.TMDB}/${endpoint}?api_key=${TMDB_KEY}&language=en-US&page=1`, {
      headers: { 'User-Agent': CONFIG.UA_DESKTOP }
    });
    
    const data = await res.json();
    const results = (data.results || []).slice(0, limit).map(r => ({
      id: r.id,
      title: r.title || r.name,
      year: (r.release_date || r.first_air_date || '').slice(0, 4),
      rating: r.vote_average,
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/original${r.backdrop_path}` : null
    }));
    
    return {
      success: true,
      type: type,
      count: results.length,
      results: results,
      provider: 'vidbox'
    };
    
  } catch (error) {
    return { error: error.message, results: [] };
  }
}

// ==================== ROUTE HANDLERS ====================

export async function handleSaveFrom(req, url) {
  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) {
    return errorResponse('Missing ?url= parameter. Example: /api/download?url=https://youtube.com/watch?v=xxx', 400);
  }
  const result = await savefromDownload(targetUrl);
  return jsonResponse(result);
}

export async function handleInstagram(req, url) {
  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) {
    return errorResponse('Missing ?url= parameter. Example: /api/instagram?url=https://instagram.com/p/xxx', 400);
  }
  const result = await instagramDownload(targetUrl);
  return jsonResponse(result);
}

export async function handleTikTokDownload(req, url) {
  const targetUrl = url.searchParams.get('url');
  if (!targetUrl) {
    return errorResponse('Missing ?url= parameter. Example: /api/tiktok?url=https://tiktok.com/@user/video/xxx', 400);
  }
  const result = await tiktokDownload(targetUrl);
  return jsonResponse(result);
}

export async function handleTikTokSearch(req, url) {
  const query = url.searchParams.get('q');
  if (!query) {
    return errorResponse('Missing ?q= parameter. Example: /api/tiktok/search?q=aesthetic', 400);
  }
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 30);
  const result = await tiktokSearch(query, limit);
  return jsonResponse(result);
}

export async function handleTikTokTrending(req, url) {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const result = await tiktokTrending(limit);
  return jsonResponse(result);
}

export async function handleVidboxSearch(req, url) {
  const query = url.searchParams.get('q');
  if (!query) {
    return errorResponse('Missing ?q= parameter. Example: /api/movies?q=transformers', 400);
  }
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '5'), 20);
  const season = parseInt(url.searchParams.get('season') || '1');
  const episode = parseInt(url.searchParams.get('episode') || '1');
  const result = await vidboxSearch(query, { limit, season, episode });
  return jsonResponse(result);
}

export async function handleVidboxTrending(req, url) {
  const type = url.searchParams.get('type') || 'movie';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 30);
  const result = await vidboxTrending(type, limit);
  return jsonResponse(result);
}

// ==================== EXPORT ALL ====================

export default {
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
};
