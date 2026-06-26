// music.js - Complete Music Services (Full Power)
// Services: Spotify Search + Download, Apple Music, SoundCloud, Remusic AI

import { CONFIG } from './config.js';
import { randomUUID, randomString, randomIP, sleep, jsonResponse, errorResponse } from './utils.js';

// ==================== SPOTIFY SEARCH (FIXED) ====================

export async function spotifySearch(query, limit = 5) {
  try {
    const secret = CONFIG.SPOTIFY_SECRET;
    
    if (!secret || secret.length === 0) {
      return await iTunesFallback(query, limit);
    }
    
    const now = Date.now();
    const counter = Math.floor(now / 30000);
    
    // Create 8-byte array for counter
    const buf = new Uint8Array(8);
    let bigCounter = BigInt(counter);
    for (let i = 7; i >= 0; i--) {
      buf[i] = Number(bigCounter & 0xFFn);
      bigCounter >>= 8n;
    }
    
    // Import key for HMAC
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    
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
      headers: { 
        'User-Agent': CONFIG.UA_DESKTOP, 
        'Origin': 'https://open.spotify.com',
        'Referer': 'https://open.spotify.com/'
      }
    });
    
    if (tokenRes.status === 429) {
      return await iTunesFallback(query, limit);
    }
    
    if (!tokenRes.ok) {
      return await iTunesFallback(query, limit);
    }
    
    let tokenData;
    try {
      tokenData = await tokenRes.json();
    } catch (e) {
      return await iTunesFallback(query, limit);
    }
    
    if (!tokenData.accessToken) {
      return await iTunesFallback(query, limit);
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
    
    if (!searchRes.ok) {
      return await iTunesFallback(query, limit);
    }
    
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
        } catch (e) {}
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
    
    if (results.length === 0) {
      return await iTunesFallback(query, limit);
    }
    
    return { success: true, query, count: results.length, results, source: 'spotify' };
  } catch (error) {
    return await iTunesFallback(query, limit);
  }
}

// ==================== ITUNES FALLBACK ====================

async function iTunesFallback(query, limit = 5) {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=${limit}&entity=song`, {
      headers: { 'User-Agent': CONFIG.UA_DESKTOP }
    });
    
    if (!res.ok) {
      return { success: false, error: 'Search failed', results: [] };
    }
    
    const data = await res.json();
    const results = (data.results || []).map(song => ({
      id: song.trackId,
      title: song.trackName,
      artist: song.artistName,
      album: song.collectionName,
      duration: song.trackTimeMillis ? Math.floor(song.trackTimeMillis / 1000) : 0,
      cover: song.artworkUrl100?.replace('100x100', '500x500'),
      preview_url: song.previewUrl,
      url: song.trackViewUrl
    }));
    
    return { success: true, query, count: results.length, results, source: 'itunes' };
  } catch (error) {
    return { success: false, error: error.message, results: [] };
  }
}

// ==================== APPLE MUSIC (ITUNES API) ====================

export async function appleMusicSearch(query, limit = 5, region = 'us') {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=${limit}&entity=song`, {
      headers: { 'User-Agent': CONFIG.UA_DESKTOP }
    });
    
    if (!res.ok) {
      return { success: false, error: `Apple Music search failed: ${res.status}`, results: [] };
    }
    
    const data = await res.json();
    const results = (data.results || []).map(song => ({
      id: song.trackId,
      title: song.trackName,
      artist: song.artistName,
      album: song.collectionName,
      duration: song.trackTimeMillis ? Math.floor(song.trackTimeMillis / 1000) : 0,
      cover: song.artworkUrl100?.replace('100x100', '500x500'),
      preview_url: song.previewUrl,
      url: song.trackViewUrl
    }));
    
    return { success: true, query, region, count: results.length, results, source: 'itunes' };
  } catch (error) {
    return { success: false, error: error.message, results: [] };
  }
}

// ==================== SOUNDCLOUD SEARCH ====================

export async function soundcloudSearch(query, limit = 5) {
  try {
    const homeRes = await fetch(CONFIG.ENDPOINTS.SOUNDCLOUD_WEB, {
      headers: { 'User-Agent': CONFIG.UA_MOBILE }
    });
    const html = await homeRes.text();
    
    let clientId = CONFIG.FALLBACKS.SOUNDCLOUD_CLIENT_ID;
    const clientIdMatch = html.match(/"client_id":"([a-zA-Z0-9]+)"/);
    if (clientIdMatch) clientId = clientIdMatch[1];
    
    const searchRes = await fetch(`${CONFIG.ENDPOINTS.SOUNDCLOUD_API}/search/tracks?q=${encodeURIComponent(query)}&limit=${limit}&client_id=${clientId}`, {
      headers: { 'User-Agent': CONFIG.UA_MOBILE }
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
              headers: { 'User-Agent': CONFIG.UA_MOBILE }
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
    
    return { success: true, query, count: results.length, results, source: 'soundcloud' };
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
    
    const body = title || lyrics ? {
      mode: 2, supplier: 10, mv: 'v4', is_instrumental: false, is_public: true,
      prompt: String(prompt || tags || title), title: title || '', tags, lyrics: lyrics || ''
    } : {
      mode: 1, supplier: 10, mv: 'v4', is_instrumental: false, is_public: true,
      prompt: tags ? `${prompt}, ${tags}` : String(prompt)
    };
    
    const createRes = await fetch(`${CONFIG.ENDPOINTS.REMUSIC_API}/music`, {
      method: 'POST', headers, body: JSON.stringify(body)
    });
    const createData = await createRes.json();
    
    if (createData.code !== 100000 || !createData.data?.length) {
      return { success: false, error: createData.message || 'Job creation failed' };
    }
    
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
    const pageRes = await fetch('https://downcloudme.com/download-track', {
      headers: { 'User-Agent': CONFIG.UA_MOBILE, 'Accept': 'text/html' }
    });
    const html = await pageRes.text();
    const cookies = pageRes.headers.getSetCookie?.()?.map(c => c.split(';')[0]).join('; ') || '';
    
    const nonce = html.match(/name="downloader_verify"\s+value="([^"]+)"/)?.[1];
    if (!nonce) return { success: false, error: 'Nonce not found' };
    
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

// ==================== SPOTIFY SEARCH & DOWNLOAD (SPOTDOWN) ====================

const SPOTDOWN_BASE = 'https://spotdown.org';
const CF_SOLVER = 'https://cf-solver-renofc.my.id/api/solvebeta';

const spotdownTokens = new Map();

async function solveCloudflare() {
  try {
    const res = await fetch(CF_SOLVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://spotdown.org',
        mode: 'waf-session'
      })
    });
    
    const data = await res.json();
    
    let cookieStr = '';
    if (Array.isArray(data.cookies)) {
      cookieStr = data.cookies.map(c => `${c.name}=${c.value}`).join('; ');
    }
    
    return {
      headers: data.headers || {},
      cookie: cookieStr
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getTurnstileToken() {
  try {
    const res = await fetch(CF_SOLVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://spotdown.org',
        mode: 'turnstile-min',
        siteKey: '0x4AAAAAACrWMhU5hqsstO80'
      })
    });
    
    const data = await res.json();
    const token = data.token?.result?.token || data.result?.token || data.token;
    
    if (!token) throw new Error('Turnstile failed');
    return token;
  } catch (error) {
    return { error: error.message };
  }
}

async function issueNonce(session) {
  try {
    const cfToken = await getTurnstileToken();
    if (cfToken.error) throw new Error(cfToken.error);
    
    const res = await fetch(`${SPOTDOWN_BASE}/api/issue-nonce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': session.cookie,
        ...session.headers
      },
      body: JSON.stringify({ cfToken })
    });
    
    const data = await res.json();
    if (!data.token) throw new Error('Nonce issuance failed');
    
    return {
      token: data.token,
      expires: data.expires || Date.now() + 600000
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function ensureToken(session) {
  if (session.token && Date.now() + 180000 < session.expires) {
    return session.token;
  }
  
  const result = await issueNonce(session);
  if (result.error) throw new Error(result.error);
  
  session.token = result.token;
  session.expires = result.expires;
  return session.token;
}

export async function spotifySearchDownload(query) {
  try {
    const session = await solveCloudflare();
    if (session.error) return { error: `CF solver error: ${session.error}` };
    
    await ensureToken(session);
    
    const res = await fetch(`${SPOTDOWN_BASE}/api/song-details?url=${encodeURIComponent(query)}`, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Cookie': session.cookie,
        'X-Session-Token': session.token,
        ...session.headers
      }
    });
    
    const data = await res.json();
    const songs = data.songs || [];
    
    return {
      success: true,
      query: query,
      count: songs.length,
      songs: songs.map(s => ({
        title: s.title,
        artist: s.artist,
        duration: s.duration,
        url: s.url,
        album: s.album,
        cover: s.cover
      }))
    };
  } catch (error) {
    return { error: error.message };
  }
}

export async function spotifyDownload(url) {
  try {
    const session = await solveCloudflare();
    if (session.error) return { error: `CF solver error: ${session.error}` };
    
    await ensureToken(session);
    
    const res = await fetch(`${SPOTDOWN_BASE}/api/direct-download?url=${encodeURIComponent(url)}&token=${session.token}`, {
      headers: {
        'Cookie': session.cookie,
        'X-Session-Token': session.token,
        ...session.headers
      }
    });
    
    if (!res.ok) {
      return { error: `Download failed: ${res.status}` };
    }
    
    const audioBuffer = await res.arrayBuffer();
    const disposition = res.headers.get('content-disposition') || '';
    const nameMatch = disposition.match(/filename="?([^";\n]+)"?/);
    const filename = nameMatch ? nameMatch[1] : `${Date.now()}.mp3`;
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
    return {
      success: true,
      filename: filename,
      audio_base64: audioBase64,
      size: audioBuffer.byteLength,
      url: url
    };
  } catch (error) {
    return { error: error.message };
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

export async function handleSpotifySearch(req, url) {
  const q = url.searchParams.get('q');
  if (!q) return errorResponse('Missing ?q=', 400);
  const result = await spotifySearchDownload(q);
  return jsonResponse(result);
}

export async function handleSpotifyDownload(req, url) {
  const trackUrl = url.searchParams.get('url');
  if (!trackUrl) return errorResponse('Missing ?url=', 400);
  const result = await spotifyDownload(trackUrl);
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
  spotifySearchDownload,
  spotifyDownload,
  iTunesFallback,
  handleSpotify,
  handleSpotifySearch,
  handleSpotifyDownload,
  handleAppleMusic,
  handleSoundCloud,
  handleRemusic,
  handleSoundCloudDL
};
