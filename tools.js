// tools.js - Complete Tools Services
// Services: Audio Transcription, Terabox Downloader, ShieldNet Security Scanner, Roblox OSINT

import { CONFIG } from './config.js';
import {
  randomUUID, randomString, randomIP, md5, sha256, base64Encode, base64Decode,
  sleep, fetchWithRetry, fetchJSON, poll,
  sessionManager, buildHeaders, buildMobileHeaders,
  jsonResponse, errorResponse, successResponse
} from './utils.js';

// ==================== AUDIO TRANSCRIPTION (audiotranscriber.io) ====================
// Transcribe audio files with speaker diarization

export async function transcribeAudio(audioUrl, options = {}) {
  const { maxRetries = 6 } = options;
  
  try {
    // Generate fingerprint
    const fp = randomString(16);
    const aesSecret = randomString(16);
    const aesEncrypt = (plain, secret) => {
      const cipher = crypto.createCipheriv("aes-128-cbc", Buffer.from(secret, "utf8"), Buffer.from(secret, "utf8"));
      return Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString("base64");
    };
    
    const fp1 = aesEncrypt(`${CONFIG.DEEPAI_APP_ID}:${fp}`, aesSecret);
    
    const pubKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`;
    
    const rsaEncrypt = (plain, publicKey) => {
      return crypto.publicEncrypt(
        { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
        Buffer.from(plain, "utf8")
      ).toString("base64");
    };
    
    const xGuide = rsaEncrypt(aesSecret, pubKey);
    const originFrom = md5("audiotranscriber.io").substring(8, 24);
    
    const authHeaders = {
      'fp': fp,
      'fp1': fp1,
      'x-guide': xGuide,
      'theme-version': CONFIG.DEEPAI_THEME,
      'X-code': String(Date.now())
    };
    
    // Fetch audio file
    const audioRes = await fetch(audioUrl, {
      headers: { 'User-Agent': CONFIG.UA_DESKTOP }
    });
    
    if (!audioRes.ok) {
      return { error: `Failed to fetch audio: ${audioRes.status}` };
    }
    
    const audioBuffer = await audioRes.arrayBuffer();
    const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';
    const ext = contentType.split('/')[1] || 'mp3';
    const fileHash = md5(new Uint8Array(audioBuffer));
    const fileName = `${fileHash}.${ext}`;
    
    // Request upload URL
    const signRes = await fetch(`${CONFIG.ENDPOINTS.TRANSCRIBE_API}/api/app/files/upload_file`, {
      method: "POST",
      headers: {
        ...authHeaders,
        'user-agent': CONFIG.UA_DESKTOP,
        'origin': CONFIG.ENDPOINTS.TRANSCRIBE_WEB,
        'referer': `${CONFIG.ENDPOINTS.TRANSCRIBE_WEB}/`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        request_from: 31,
        origin_from: originFrom,
        file_name: fileName,
        type: "audio"
      })
    });
    
    const signData = await signRes.json();
    
    if (!signData.url) {
      return { error: 'Failed to get upload URL' };
    }
    
    // Upload to OSS
    const uploadRes = await fetch(signData.url, {
      method: "PUT",
      headers: {
        'content-type': `audio/${ext}`,
        'origin': CONFIG.ENDPOINTS.TRANSCRIBE_WEB,
        'referer': `${CONFIG.ENDPOINTS.TRANSCRIBE_WEB}/`,
        'user-agent': CONFIG.UA_DESKTOP,
        'x-oss-storage-class': 'Standard',
        'theme-version': CONFIG.DEEPAI_THEME
      },
      body: audioBuffer
    });
    
    if (!uploadRes.ok) {
      return { error: `Upload failed: ${uploadRes.status}` };
    }
    
    const cdnUrl = "https://temp.audiotranscriber.io/" + signData.url.split("?")[0].split("aliyuncs.com/")[1];
    
    // Request transcription
    const transcribeRes = await fetch(`${CONFIG.ENDPOINTS.TRANSCRIBE_API}/api/app/tr/files`, {
      method: "POST",
      headers: {
        ...authHeaders,
        'user-agent': CONFIG.UA_DESKTOP,
        'origin': CONFIG.ENDPOINTS.TRANSCRIBE_WEB,
        'referer': `${CONFIG.ENDPOINTS.TRANSCRIBE_WEB}/`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        request_from: 31,
        origin_from: originFrom,
        url: cdnUrl,
        platform: "2",
        title: fileName,
        actual_url: ""
      })
    });
    
    const transcribeData = await transcribeRes.json();
    
    if (!transcribeData.data || !transcribeData.data.length) {
      return { error: 'Transcription failed' };
    }
    
    const segments = transcribeData.data.map(s => ({
      text: s.text.trim(),
      start: s.start,
      duration: s.dur,
      speaker: s.speaker || ""
    }));
    
    const fullText = segments.map(s => s.text).join(" ").trim();
    const lastSegment = segments[segments.length - 1];
    const totalDuration = lastSegment ? +(lastSegment.start + lastSegment.duration).toFixed(2) : 0;
    
    return {
      success: true,
      text: fullText,
      duration: totalDuration,
      segments: segments,
      provider: 'audiotranscriber'
    };
    
  } catch (error) {
    return { error: error.message, provider: 'audiotranscriber' };
  }
}

// ==================== TERABOX DOWNLOADER ====================
// Download files from Terabox (1024teradownloader.com)

export async function teraboxDownload(url) {
  try {
    // Get landing page for cookies
    const landingRes = await fetch(CONFIG.ENDPOINTS.TERABOX + "/", {
      headers: buildMobileHeaders({ 'Accept': 'text/html' })
    });
    
    const cookies = landingRes.headers.getSetCookie?.()?.map(c => c.split(';')[0]).join('; ') || '';
    
    if (!cookies) {
      return { error: 'Failed to get session cookies' };
    }
    
    // Submit URL
    const formData = new FormData();
    formData.append('url', url);
    
    const res = await fetch(CONFIG.ENDPOINTS.TERABOX_API, {
      method: "POST",
      headers: {
        ...buildMobileHeaders(),
        'origin': CONFIG.ENDPOINTS.TERABOX,
        'referer': CONFIG.ENDPOINTS.TERABOX + "/",
        'cookie': cookies
      },
      body: formData
    });
    
    const data = await res.json();
    
    if (data.status !== 'success') {
      return { error: data.message || 'Terabox API error' };
    }
    
    const files = (data.list || []).map(f => ({
      id: f.fs_id,
      name: f.name,
      path: f.file_path,
      type: f.type,
      is_folder: f.is_dir === "1" || f.is_dir === 1,
      size: f.size,
      size_formatted: f.size_formatted,
      download_url: f.normal_dlink,
      folder: f.folder
    }));
    
    return {
      success: true,
      source_url: url,
      total_files: data.total_files || 0,
      total_folders: data.total_folders || 0,
      files: files,
      provider: 'terabox'
    };
    
  } catch (error) {
    return { error: error.message, provider: 'terabox' };
  }
}

// ==================== SHIELDNET SECURITY SCANNER ====================
// Scan website security (HTTPS, headers, DNS, TLS, etc.)

export async function shieldnetScan(domain, options = {}) {
  const { maxRetries = 3 } = options;
  
  try {
    const sessionId = `session_${Date.now()}_${randomString(6)}`;
    
    // Send conversion event
    const conversionRes = await fetch(`${CONFIG.ENDPOINTS.SHIELDNET_API}/conversion-events`, {
      method: "POST",
      headers: {
        ...buildHeaders(),
        'content-type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({
        sessionId: sessionId,
        eventType: "scan_start",
        eventData: {
          domain: domain,
          variant: "control",
          trafficSource: "https://www.shieldnet.app/",
          timestamp: new Date().toISOString()
        },
        userEmail: null
      })
    });
    
    // Enqueue scan
    const enqueueRes = await fetch(`${CONFIG.ENDPOINTS.SHIELDNET_API}/scan-counter`, {
      method: "POST",
      headers: {
        ...buildHeaders(),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        action: "enqueue",
        scannerType: "website",
        target: domain
      })
    });
    
    // Wait a bit for scan to process
    await sleep(3000);
    
    // Get scan results (with retries)
    let scanData = null;
    for (let i = 0; i < maxRetries; i++) {
      const scanRes = await fetch(`${CONFIG.ENDPOINTS.SHIELDNET_API}/free-scan?domain=${encodeURIComponent(domain)}`, {
        headers: buildHeaders()
      });
      
      scanData = await scanRes.json();
      
      if (scanData && scanData.domain) {
        break;
      }
      
      await sleep(2000);
    }
    
    if (!scanData || !scanData.domain) {
      return { error: 'Scan failed or timeout' };
    }
    
    return {
      success: true,
      domain: scanData.domain,
      scanned_at: scanData.scannedAt,
      grade: scanData.grade,
      final_grade: scanData.finalGrade,
      adjusted_grade: scanData.adjustedGrade,
      score: scanData.score,
      https: scanData.https,
      cookies: scanData.cookies,
      headers: scanData.headers,
      dns_analysis: scanData.dnsAnalysis,
      tls_analysis: scanData.tlsAnalysis,
      hsts_preload: scanData.hstsPreload,
      cdn_detection: scanData.cdnDetection,
      recommendations: scanData.recommendations,
      scan_duration_ms: scanData.scanDurationMs,
      cached: scanData.cached,
      provider: 'shieldnet'
    };
    
  } catch (error) {
    return { error: error.message, provider: 'shieldnet' };
  }
}

// ==================== ROBLOX OSINT ====================
// Get detailed Roblox user information

export async function robloxStalk(usernameOrId) {
  try {
    // Resolve username to ID
    let userId = null;
    
    if (/^\d+$/.test(usernameOrId)) {
      userId = parseInt(usernameOrId);
    } else {
      const resolveRes = await fetch(`${CONFIG.ENDPOINTS.ROBLOX_USERS}/usernames/users`, {
        method: "POST",
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usernames: [usernameOrId.replace(/^@/, '')], excludeBannedUsers: false })
      });
      const resolveData = await resolveRes.json();
      userId = resolveData?.data?.[0]?.id || null;
    }
    
    if (!userId) {
      return { error: 'User not found' };
    }
    
    // Fetch all data in parallel
    const [user, userInfo, friendsCount, followersCount, followingsCount, groups, presence] = await Promise.all([
      fetchJSON(`${CONFIG.ENDPOINTS.ROBLOX_USERS}/users/${userId}`),
      fetchJSON(`https://users.roblox.com/v1/users/${userId}`),
      fetchJSON(`${CONFIG.ENDPOINTS.ROBLOX_FRIENDS}/users/${userId}/friends/count`),
      fetchJSON(`${CONFIG.ENDPOINTS.ROBLOX_FRIENDS}/users/${userId}/followers/count`),
      fetchJSON(`${CONFIG.ENDPOINTS.ROBLOX_FRIENDS}/users/${userId}/followings/count`),
      fetchJSON(`${CONFIG.ENDPOINTS.ROBLOX_GROUPS}/users/${userId}/groups/roles`),
      fetchJSON(`https://presence.roblox.com/v1/presence/users`, {
        method: "POST",
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] })
      })
    ]);
    
    const userData = userInfo || user;
    if (!userData) {
      return { error: 'User data not found' };
    }
    
    const presenceData = presence?.userPresences?.[0] || {};
    const created = userData.created ? new Date(userData.created) : null;
    
    return {
      success: true,
      id: userData.id,
      username: userData.name,
      display_name: userData.displayName,
      description: userData.description || "",
      created: userData.created,
      age_days: created ? Math.floor((Date.now() - created.getTime()) / 86400000) : null,
      is_banned: !!userData.isBanned,
      has_verified_badge: !!userData.hasVerifiedBadge,
      stats: {
        friends: friendsCount?.count || 0,
        followers: followersCount?.count || 0,
        following: followingsCount?.count || 0,
        groups: groups?.data?.length || 0
      },
      presence: {
        status: CONFIG.ROBLOX_PRESENCE_TYPES[presenceData.userPresenceType] || "Unknown",
        last_location: presenceData.lastLocation || null,
        last_online: presenceData.lastOnline || null,
        place_id: presenceData.placeId || null,
        universe_id: presenceData.universeId || null
      },
      groups: (groups?.data || []).map(g => ({
        id: g.group.id,
        name: g.group.name,
        member_count: g.group.memberCount,
        owner: g.group.owner?.username || null,
        role: g.role.name,
        role_rank: g.role.rank
      })),
      profile_url: `https://www.roblox.com/users/${userId}/profile`,
      provider: 'roblox'
    };
    
  } catch (error) {
    return { error: error.message, provider: 'roblox' };
  }
}

// ==================== ROUTE HANDLERS ====================

export async function handleTranscribe(req, url) {
  const audioUrl = url.searchParams.get('url');
  
  if (!audioUrl) {
    return errorResponse('Missing ?url= parameter (audio file URL)', 400);
  }
  
  const result = await transcribeAudio(audioUrl);
  return jsonResponse(result);
}

export async function handleTerabox(req, url) {
  const teraboxUrl = url.searchParams.get('url');
  
  if (!teraboxUrl) {
    return errorResponse('Missing ?url= parameter (Terabox URL)', 400);
  }
  
  const result = await teraboxDownload(teraboxUrl);
  return jsonResponse(result);
}

export async function handleSecurityScan(req, url) {
  const domain = url.searchParams.get('domain');
  
  if (!domain) {
    return errorResponse('Missing ?domain= parameter', 400);
  }
  
  const result = await shieldnetScan(domain);
  return jsonResponse(result);
}

export async function handleRobloxStalk(req, url) {
  const user = url.searchParams.get('user');
  
  if (!user) {
    return errorResponse('Missing ?user= parameter (username or ID)', 400);
  }
  
  const result = await robloxStalk(user);
  return jsonResponse(result);
}

// ==================== EXPORT ALL ====================

export default {
  transcribeAudio,
  teraboxDownload,
  shieldnetScan,
  robloxStalk,
  handleTranscribe,
  handleTerabox,
  handleSecurityScan,
  handleRobloxStalk
};
