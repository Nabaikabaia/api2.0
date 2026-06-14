// music.js - Complete Music Services (Fixed for Cloudflare Workers)
// Services: Spotify Search, Apple Music, SoundCloud, Remusic AI

import { CONFIG } from './config.js';
import {
  randomUUID, randomString, randomIP, md5, sha256,
  parseSSE, sleep, fetchWithRetry, fetchJSON,
  sessionManager, buildHeaders, buildMobileHeaders,
  jsonResponse, errorResponse, successResponse
} from './utils.js';

// ==================== SPOTIFY SEARCH (FIXED - No Buffer) ====================

export async function spotifySearch(query, limit = 5) {
  try {
    const secret = CONFIG.FALLBACKS.SPOTIFY_SECRET;
    const now = Date.now();
    const counter = Math.floor(now / 30000);
    
    // Create 8-byte array for counter (BigInt -> bytes) - Cloudflare compatible
    const buf = new Uint8Array(8);
    let bigCounter = BigInt(counter);
    for (let i = 7; i >= 0; i--) {
      buf[i] = Number(bigCounter & 0xFFn);
      bigCounter >>= 8n;
    }
    
    // HMAC-SHA1 using Web Crypto API
    const keyData = new TextEncoder().encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, buf);
    const digest = new Uint8Array(signature);
    
    const offset = digest[digest.length - 1] & 0xf;
    const totp = (((digest[offset] << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3]) & 0x7fffffff) % 1000000;
    const totpStr = totp.toString().padStart(6, "0");
    
    // Get access token
    const tokenRes = await fetch(`https://open.spotify.com/api/token?reason=init&totp=${totpStr}&totpVer=61&productType=web-player`, {
      headers: { 'User-Agent': CONFIG.UA_DESKTOP, 'Origin': 'https://open.spotify.com' }
    });
    const tokenData = await tokenRes.json();
    
    if (!tokenData.accessToken) {
      return { success: false, error: 'Spotify token failed', results: [] };
    }
    
    // Search tracks
    const searchRes = await fetch(`https://api-partner.spotify.com/pathfinder/v1/query?operationName=searchDesktop&variables=${encodeURIComponent(JSON.stringify({
      searchTerm: query, offset: 0, limit: limit, numberOfTopResults: 1, includeAudiobooks: false
    }))}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.accessToken}`,
        'client-token': tokenData.clientToken || '',
        'User-Agent': CONFIG.UA_DESKTOP,
        'app-platform': 'WebPlayer'
      }
    });
    
    const data = await searchRes.json();
    const items = data?.data?.searchV2?.tracksV2?.items || [];
    
    const results = [];
    for (const item of items) {
      const track = item?.item?.data;
      if (!track) continue;
      
      const trackId = track.uri?.split(':')[2];
      let previewUrl = null;
      
      if (trackId) {
        try {
          const embedRes = await fetch(`https://open.spotify.com/embed/track/${trackId}`, {
            headers: { 'User-Agent': CONFIG.UA_DESKTOP }
          });
          const embedHtml = await embedRes.text();
          const previewMatch = embedHtml.match(/https:\/\/p\.scdn\.co\/mp3-preview\/[a-zA-Z0-9]+/);
          if (previewMatch) previewUrl = previewMatch[0];
        } catch {}
      }
      
      results.push({
        id: trackId,
        title: track.name,
        artist: track.artists?.items?.[0]?.profile?.name,
        album: track.albumOfTrack?.name,
        duration: track.duration?.totalMilliseconds ? Math.floor(track.duration.totalMilliseconds / 1000) : 0,
        cover: track.albumOfTrack?.coverArt?.sources?.[0]?.url?.replace('{w}', '500').replace('{h}', '500'),
        preview_url: previewUrl,
        url: trackId ? `https://open.spotify.com/track/${trackId}` : null
      });
    }
    
    return { success: true, query, count: results.length, results };
  } catch (error) {
    return { success: false, error: error.message, results: [] };
  }
}

// ==================== APPLE MUSIC SEARCH ====================

export async function appleMusicSearch(query, limit = 5, region = 'us') {
  try {
    // Get token from web player
    const webRes = await fetch(CONFIG.ENDPOINTS.APPLE_MUSIC_WEB, {
      headers: { 'User-Agent': CONFIG.UA_DESKTOP }
    });
    const html = await webRes.text();
    
    // Find and fetch JS bundle
    const jsMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (!jsMatch) return { success: false, error: 'JS bundle not found', results: [] };
    
    const jsRes = await fetch(CONFIG.ENDPOINTS.APPLE_MUSIC_WEB + jsMatch[1], {
      headers: { 'User-Agent': CONFIG.UA_DESKTOP }
    });
    const js = await jsRes.text();
    
    // Extract token
    const tokenMatch = js.match(/eyJh[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/);
    if (!tokenMatch) return { success: false, error: 'Token not found', results: [] };
    
    // Search
    const searchRes = await fetch(`${CONFIG.ENDPOINTS.APPLE_MUSIC}/v1/catalog/${region}/search?term=${encodeURIComponent(query)}&limit=${limit}&types=songs`, {
      headers: {
        'Authorization': `Bearer ${tokenMatch[0]}`,
        'Origin': CONFIG.ENDPOINTS.APPLE_MUSIC_WEB,
        'Referer': CONFIG.ENDPOINTS.APPLE_MUSIC_WEB + '/',
        'User-Agent': CONFIG.UA_DESKTOP
      }
    });
    
    const data = await searchRes.json();
    const songs = data?.results?.songs?.data || [];
    
    const results = songs.map(song => ({
      id: song.id,
      title: song.attributes?.name,
      artist: song.attributes?.artistName,
      album: song.attributes?.albumName,
      duration: song.attributes?.durationInMillis ? Math.floor(song.attributes.durationInMillis / 1000) : 0,
      cover: song.attributes?.artwork?.url?.replace('{w}', '500').replace('{h}', '500'),
      preview_url: song.attributes?.previews?.[0]?.url || null,
      url: song.attributes?.url
    }));
    
    return { success: true, query, region, count: results.length, results };
  } catch (error) {
    return { success: false, error: error.message, results: [] };
  }
}

// ==================== SOUNDCLOUD SEARCH ====================

export async function soundcloudSearch(query, limit = 5) {
  try {
    // Get client_id from homepage
    const homeRes = await fetch(CONFIG.ENDPOINTS.SOUNDCLOUD_WEB, {
      headers: buildMobileHeaders()
    });
    const html = await homeRes.text();
    
    let clientId = CONFIG.FALLBACKS.SOUNDCLOUD_CLIENT_ID;
    const clientIdMatch = html.match(/"client_id":"([a-zA-Z0-9]+)"/);
    if (clientIdMatch) clientId = clientIdMatch[1];
    
    // Search tracks
    const searchRes = await fetch(`${CONFIG.ENDPOINTS.SOUNDCLOUD_API}/search/tracks?q=${encodeURIComponent(query)}&limit=${limit}&client_id=${clientId}&linked_partitioning=1&app_version=1774459502&app_locale=en`, {
      headers: buildMobileHeaders()
    });
    
    const data = await searchRes.json();
    const tracks = data.collection || [];
    
    const results = [];
    for (const track of tracks) {
      let streamUrl = null;
      const transcodings = track.media?.transcodings;
      
      if (transcodings) {
        const progressive = transcodings.find(t => t.format?.protocol === 'progressive');
        const target = progressive || transcodings[0];
        
        if (target?.url) {
          try {
            const streamRes = await fetch(`${target.url}?client_id=${clientId}`, {
              headers: buildMobileHeaders()
            });
            const streamData = await streamRes.json();
            streamUrl = streamData.url;
          } catch {}
        }
      }
      
      results.push({
        id: track.id,
        title: track.title,
        artist: track.user?.username,
        duration: Math.floor((track.duration || 0) / 1000),
        artwork: track.artwork_url?.replace('large', 't500x500') || track.user?.avatar_url,
        stream_url: streamUrl,
        url: track.permalink_url,
        plays: track.playback_count,
        likes: track.likes_count
      });
    }
    
    return { success: true, query, count: results.length, results };
  } catch (error) {
    return { success: false, error: error.message, results: [] };
  }
}

// ==================== REMUSIC AI MUSIC GENERATION ====================

export async function remusicGenerate(prompt, options = {}) {
  const { styles = [], title = null, lyrics = null } = options;
  
  try {
    const tags = styles.filter(Boolean).join(', ');
    const anonymousId = randomUUID();
    const freshGa = `GA1.1.${Math.floor(Math.random() * 9e9 + 1e9)}.${Math.floor(Date.now() / 1000)}`;
    
    const headers = {
      'accept': 'application/json',
      'content-type': 'application/json',
      'origin': CONFIG.ENDPOINTS.REMUSIC_WEB,
      'referer': `${CONFIG.ENDPOINTS.REMUSIC_WEB}/ai-music-generator`,
      'user-agent': CONFIG.UA_DESKTOP,
      'cookie': `_ga=${freshGa}; anonymous_user_id=${anonymousId}`,
      'x-forwarded-for': randomIP()
    };
    
    // Build request body
    const body = title || lyrics ? {
      mode: 2, supplier: 10, mv: 'v4', is_instrumental: false, is_public: true,
      prompt: String(prompt || tags || title), title: title || '', tags, lyrics: lyrics || ''
    } : {
      mode: 1, supplier: 10, mv: 'v4', is_instrumental: false, is_public: true,
      prompt: tags ? `${prompt}, ${tags}` : String(prompt)
    };
    
    // Create job
    const createRes = await fetch(`${CONFIG.ENDPOINTS.REMUSIC_API}/music`, {
      method: 'POST', headers, body: JSON.stringify(body)
    });
    const createData = await createRes.json();
    
    if (createData.code !== 100000 || !createData.data?.length) {
      return { success: false, error: createData.message || 'Job creation failed' };
    }
    
    // Poll for completion
    const songId = createData.data[0].song_id;
    let song = null;
    
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      
      const pollRes = await fetch(`${CONFIG.ENDPOINTS.REMUSIC_API}/music/${songId}`, { headers });
      const pollData = await pollRes.json();
      const row = pollData?.data;
      
      if (row?.status === 'success' && row.audio_url) {
        song = {
          id: row.song_id,
          title: row.title,
          audio_url: row.audio_url,
          image_url: row.image_url,
          duration: row.duration
        };
        break;
      }
      
      if (row?.status === 'failed') {
        return { success: false, error: 'Generation failed' };
      }
    }
    
    if (!song) return { success: false, error: 'Timeout' };
    
    return { success: true, song };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== SOUNDCLOUD DOWNLOADER ====================

export async function soundcloudDownload(url) {
  try {
    // Get initial page
    const pageRes = await fetch('https://downcloudme.com/download-track', {
      headers: buildMobileHeaders({ 'Accept': 'text/html' })
    });
    const html = await pageRes.text();
    const cookies = pageRes.headers.getSetCookie?.()?.map(c => c.split(';')[0]).join('; ') || '';
    
    // Extract nonce
    const nonce = html.match(/name="downloader_verify"\s+value="([^"]+)"/)?.[1];
    if (!nonce) return { success: false, error: 'Nonce not found' };
    
    // Submit form
    const form = new URLSearchParams();
    form.set('url', url);
    form.set('downloader_verify', nonce);
    form.set('_wp_http_referer', '/download-track');
    
    const res = await fetch('https://downcloudme.com/download-track', {
      method: 'POST', redirect: 'follow',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'origin': 'https://downcloudme.com',
        'referer': 'https://downcloudme.com/download-track',
        'user-agent': CONFIG.UA_MOBILE,
        'cookie': cookies
      },
      body: form.toString()
    });
    
    const result = await res.text();
    const dlUrl = result.match(/data-direct="(https?:\/\/[^"]+\.mp3[^"]*)"/)?.[1];
    
    if (!dlUrl) return { success: false, error: 'Download URL not found' };
    
    return { success: true, download_url: dlUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== ROUTE HANDLERS ====================

export async function handleSpotify(req, url) {
  const q = url.searchParams.get('q');
  if (!q) return errorResponse('Missing ?q=', 400);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '5'), 20);
  const result = await spotifySearch(q, limit);
  return jsonResponse(result);
}

export async function handleAppleMusic(req, url) {
  const q = url.searchParams.get('q');
  if (!q) return errorResponse('Missing ?q=', 400);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '5'), 20);
  const region = url.searchParams.get('region') || 'us';
  const result = await appleMusicSearch(q, limit, region);
  return jsonResponse(result);
}

export async function handleSoundCloud(req, url) {
  const q = url.searchParams.get('q');
  if (!q) return errorResponse('Missing ?q=', 400);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '5'), 20);
  const result = await soundcloudSearch(q, limit);
  return jsonResponse(result);
}

export async function handleRemusic(req, url) {
  const q = url.searchParams.get('q');
  if (!q) return errorResponse('Missing ?q=', 400);
  const styles = url.searchParams.get('styles')?.split(',').filter(Boolean) || [];
  const result = await remusicGenerate(q, { styles });
  return jsonResponse(result);
}

export async function handleSoundCloudDL(req, url) {
  const u = url.searchParams.get('url');
  if (!u) return errorResponse('Missing ?url=', 400);
  const result = await soundcloudDownload(u);
  return jsonResponse(result);
}

// ==================== EXPORT ====================

export default {
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
};
