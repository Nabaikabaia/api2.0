// tools.js - Complete Tools Services (Full Power)
// Services: Audio Transcription, Terabox, ShieldNet, Roblox, Translate, FaceAge, Manga District

import { CONFIG } from './config.js';
import {
  randomUUID, randomString, randomIP, md5, sha256, base64Encode, base64Decode,
  sleep, fetchWithRetry, fetchJSON, poll,
  sessionManager, buildHeaders, buildMobileHeaders,
  jsonResponse, errorResponse, successResponse
} from './utils.js';

// ==================== AUDIO TRANSCRIPTION (audiotranscriber.io) ====================

export async function transcribeAudio(audioUrl, options = {}) {
  const { maxRetries = 6 } = options;
  
  try {
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
      segments: segments
    };
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== TERABOX DOWNLOADER ====================

export async function teraboxDownload(url) {
  try {
    const landingRes = await fetch(CONFIG.ENDPOINTS.TERABOX + "/", {
      headers: buildMobileHeaders({ 'Accept': 'text/html' })
    });
    
    const cookies = landingRes.headers.getSetCookie?.()?.map(c => c.split(';')[0]).join('; ') || '';
    
    if (!cookies) {
      return { error: 'Failed to get session cookies' };
    }
    
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
      files: files
    };
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== SHIELDNET SECURITY SCANNER ====================

export async function shieldnetScan(domain, options = {}) {
  const { maxRetries = 3 } = options;
  
  try {
    const sessionId = `session_${Date.now()}_${randomString(6)}`;
    
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
    
    await sleep(3000);
    
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
      cached: scanData.cached
    };
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== ROBLOX OSINT ====================

export async function robloxStalk(usernameOrId) {
  try {
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
      profile_url: `https://www.roblox.com/users/${userId}/profile`
    };
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== GOOGLE TRANSLATE + TTS ====================

const LANGUAGES = {
  'auto': 'Auto Detect',
  'id': 'Indonesian',
  'en': 'English',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese (Simplified)',
  'ar': 'Arabic',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'hi': 'Hindi',
  'th': 'Thai',
  'vi': 'Vietnamese'
};

export async function googleTranslate(text, from = 'auto', to = 'en', mode = 'text-to-text') {
  try {
    const translateUrl = 'https://translate.googleapis.com/translate_a/single';
    const params = new URLSearchParams({
      client: 'gtx',
      sl: from,
      tl: to,
      q: text
    });
    
    // Add multiple dt params
    params.append('dt', 't');
    params.append('dt', 'bd');
    params.append('dt', 'rm');
    params.append('dt', 'ss');
    params.append('dt', 'md');
    params.append('dt', 'ld');
    params.append('dt', 'ex');
    
    const res = await fetch(`${translateUrl}?${params.toString()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!res.ok) {
      return { success: false, error: `Translation failed: ${res.status}` };
    }
    
    const data = await res.json();
    
    let translatedText = '';
    let detectedLang = from;
    
    if (Array.isArray(data)) {
      if (Array.isArray(data[0])) {
        translatedText = data[0].map(item => item[0]).join('');
      }
      if (data[2]) {
        detectedLang = data[2];
      }
    }
    
    if (mode === 'text-to-audio') {
      const audioBase64 = await googleTTS(translatedText || text, to);
      
      return {
        success: true,
        mode: 'text-to-audio',
        input: text,
        detected_from: detectedLang,
        to: to,
        translated_text: translatedText || text,
        audio_base64: audioBase64,
        format: 'mp3'
      };
    }
    
    return {
      success: true,
      mode: 'text-to-text',
      input: text,
      detected_from: detectedLang,
      to: to,
      translated_text: translatedText || text
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function googleTTS(text, lang = 'en') {
  try {
    const url = `https://translate.google.com/translate_tts`;
    const params = new URLSearchParams({
      ie: 'UTF-8',
      q: text,
      tl: lang,
      client: 'gtx',
      ttsspeed: '1.0'
    });
    
    const res = await fetch(`${url}?${params.toString()}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com/'
      }
    });
    
    if (!res.ok) {
      throw new Error(`TTS failed: ${res.status}`);
    }
    
    const audioBuffer = await res.arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
  } catch (error) {
    throw new Error(`TTS error: ${error.message}`);
  }
}

// ==================== FACEAGE AI (AGE ESTIMATION) ====================

export async function faceAgeDetect(imageUrl) {
  try {
    const homeRes = await fetch('https://faceage.ai/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
      }
    });
    
    const html = await homeRes.text();
    const cookies = homeRes.headers.getSetCookie?.()?.map(c => c.split(';')[0]).join('; ') || '';
    
    let csrf = html.match(/name="csrf_token"\s+value="([^"]+)"/i)?.[1] ||
               html.match(/csrf_token["']?\s*:\s*["']([^"']+)/i)?.[1] ||
               html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i)?.[1];
    
    if (!csrf) {
      return { success: false, error: 'CSRF token not found' };
    }
    
    const imgRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!imgRes.ok) {
      return { success: false, error: `Failed to fetch image: ${imgRes.status}` };
    }
    
    const imageBuffer = await imgRes.arrayBuffer();
    
    const formData = new FormData();
    formData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }), 'image.jpg');
    formData.append('csrf_token', csrf);
    
    const uploadRes = await fetch('https://faceage.ai/upload', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookies,
        'Origin': 'https://faceage.ai',
        'Referer': 'https://faceage.ai/'
      },
      body: formData
    });
    
    const result = await uploadRes.json();
    
    return {
      success: true,
      result: result
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== MANGA DISTRICT SCRAPER ====================

const MANGA_BASE = 'https://mangadistrict.com';

function clean(obj) {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) {
    const cleaned = obj.map(i => clean(i)).filter(i => i !== undefined);
    return cleaned.length ? cleaned : undefined;
  }
  if (typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      const val = clean(obj[key]);
      if (val !== undefined) result[key] = val;
    }
    return Object.keys(result).length ? result : undefined;
  }
  return obj;
}

function parseChapterNumber(text) {
  if (!text) return null;
  const match = text.match(/(?:Vol\.?\s*\d+[:\s]*)?[Cc]h(?:apter)?\s*(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

export async function mangaDistrictList(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Referer': MANGA_BASE + '/'
      }
    });
    
    const html = await res.text();
    const $ = cheerio.load(html);

    const items = [];
    $('.page-item-detail.manga').each((i, el) => {
      const $el = $(el);
      const titleEl = $el.find('.post-title h3 a, .post-title h1 a').first();
      const title = titleEl.text().trim();
      const link = titleEl.attr('href');

      if (!title || !link) return;

      const poster = $el.find('.item-thumb img, .summary_image img').first().attr('src') || null;

      let rating = null;
      const ratingText = $el.find('.score.font-meta.total_votes, .post-rating .score').text().trim();
      if (ratingText) {
        const match = ratingText.match(/([\d.]+)/);
        if (match) rating = parseFloat(match[1]);
      }

      let status = null;
      const badges = [];
      $el.find('.manga-title-badges .text').each((j, b) => {
        const txt = $(b).text().trim();
        badges.push(txt);
        if (['Ongoing', 'Completed', 'Hiatus', 'On-Going', 'Complete'].includes(txt)) {
          status = txt;
        }
      });

      const chapterEl = $el.find('.list-chapter .chapter-item:first-child .chapter a').first();
      const latestChapter = {
        title: chapterEl.text().trim() || null,
        url: chapterEl.attr('href') || null
      };

      let updateTime = null;
      const timeSelectors = [
        '.list-chapter .chapter-item:first-child .post-on .timediff',
        '.list-chapter .chapter-item:first-child .post-on time',
        '.chapter-date',
        '.post-on time'
      ];
      for (const sel of timeSelectors) {
        const el = $el.find(sel).first();
        if (el.length) {
          updateTime = el.text().trim() || el.attr('datetime') || null;
          if (updateTime) break;
        }
      }

      const viewsEl = $el.find('.list-chapter .chapter-item:first-child .views').first();
      const views = viewsEl.text().trim() || null;

      const genres = [];
      const genreSelectors = [
        '.mg_genres .summary-content a',
        '.genres-content a',
        '.post-content_item.mg_genres .summary-content a',
        '.item-summary .genres a'
      ];
      for (const sel of genreSelectors) {
        const found = $el.find(sel);
        if (found.length) {
          found.each((j, g) => genres.push($(g).text().trim()));
          break;
        }
      }

      const authorSelectors = ['.mg_author .summary-content', '.author-content a'];
      let author = null;
      for (const sel of authorSelectors) {
        const el = $el.find(sel).first();
        if (el.length) { author = el.text().trim() || null; break; }
      }

      items.push({
        title,
        link: link.startsWith('http') ? link : MANGA_BASE + link,
        poster,
        rating,
        status,
        badges,
        latestChapter,
        updateTime,
        views,
        genres,
        author
      });
    });

    let next = null;
    const nextEl = $('.wp-pagenavi .page-numbers.next');
    if (nextEl.length) next = nextEl.attr('href');

    const currentPage = parseInt($('.wp-pagenavi .page-numbers.current').text()) || 1;

    return clean({
      creator: "NABEES",
      page: 'list',
      data: {
        url,
        count: items.length,
        currentPage,
        items,
        next: next ? (next.startsWith('http') ? next : MANGA_BASE + next) : null
      }
    });
  } catch (error) {
    return { error: error.message };
  }
}

export async function mangaDistrictDetail(slug) {
  try {
    const url = slug.startsWith('http') ? slug : MANGA_BASE + '/series/' + slug.replace(/^\/+/, '');
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Referer': MANGA_BASE + '/'
      }
    });
    
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $('.profile-manga .post-title h1').text().trim() || $('meta[property="og:title"]').attr('content') || '';
    const poster = $('.profile-manga .summary_image img').first().attr('src') || null;

    const altNames = [];
    const altEl = $('.post-content_item:contains("Alternative") .summary-content');
    if (altEl.length) {
      altEl.text().split(',').forEach(s => {
        const trimmed = s.trim();
        if (trimmed) altNames.push(trimmed);
      });
    }

    const author = $('.mg_author .summary-content').text().trim() || null;
    const genres = [];
    $('.mg_genres .summary-content a, .genres-content a').each((i, el) => {
      genres.push($(el).text().trim());
    });

    const status = $('.mg_status .summary-content').text().trim() || null;

    let rating = null;
    const ratingEl = $('.post-rating .score');
    if (ratingEl.length) {
      rating = parseFloat(ratingEl.text().trim());
    }

    const description = $('.description-summary').text().trim() || null;

    let chapters = [];
    $('.page-content-listing .wp-manga-chapter, .listing-chapters_wrap .wp-manga-chapter').each((i, el) => {
      const $el = $(el);
      const linkEl = $el.find('a').first();
      const chapterTitle = linkEl.find('.chap-title').text().trim() || linkEl.text().trim();
      const url = linkEl.attr('href');
      const date = $el.find('.chap-date').text().trim() || null;
      const number = parseChapterNumber(chapterTitle);

      chapters.push({
        number,
        title: chapterTitle,
        url: url ? (url.startsWith('http') ? url : MANGA_BASE + url) : null,
        date
      });
    });

    return clean({
      creator: "NABEES",
      page: 'detail',
      data: {
        url,
        slug,
        title,
        poster,
        altNames,
        author,
        genres,
        status,
        rating,
        description,
        chapters
      }
    });
  } catch (error) {
    return { error: error.message };
  }
}

export async function mangaDistrictChapter(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Referer': url
      }
    });
    
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $('.entry-header .breadcrumb span:last-child').text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  '';

    const images = [];
    $('.reading-content.manga-chapter img, .reading-content img, .page-break img').each((i, el) => {
      const $el = $(el);
      const src = $el.attr('src') ||
                  $el.attr('data-src') ||
                  $el.attr('data-lazy-src') ||
                  null;
      if (src && !src.startsWith('data:image')) {
        images.push({
          src,
          alt: $el.attr('alt') || null,
          index: i + 1
        });
      }
    });

    let prevChapter = null;
    const prevEl = $('.nav-previous a, .nav-links a:contains("Previous")');
    if (prevEl.length) prevChapter = prevEl.attr('href');

    let nextChapter = null;
    const nextEl = $('.nav-next a, .nav-links a:contains("Next")');
    if (nextEl.length) nextChapter = nextEl.attr('href');

    return clean({
      creator: "NABEES",
      page: 'chapter',
      data: {
        url,
        title,
        images,
        prevChapter: prevChapter ? (prevChapter.startsWith('http') ? prevChapter : MANGA_BASE + prevChapter) : null,
        nextChapter: nextChapter ? (nextChapter.startsWith('http') ? nextChapter : MANGA_BASE + nextChapter) : null
      }
    });
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== ROUTE HANDLERS ====================

export async function handleTranscribe(req, url) {
  const audioUrl = url.searchParams.get('url');
  if (!audioUrl) return errorResponse('Missing ?url= (audio file URL)', 400);
  
  const result = await transcribeAudio(audioUrl);
  return jsonResponse(result);
}

export async function handleTerabox(req, url) {
  const teraboxUrl = url.searchParams.get('url');
  if (!teraboxUrl) return errorResponse('Missing ?url= (Terabox URL)', 400);
  
  const result = await teraboxDownload(teraboxUrl);
  return jsonResponse(result);
}

export async function handleSecurityScan(req, url) {
  const domain = url.searchParams.get('domain');
  if (!domain) return errorResponse('Missing ?domain=', 400);
  
  const result = await shieldnetScan(domain);
  return jsonResponse(result);
}

export async function handleRobloxStalk(req, url) {
  const user = url.searchParams.get('user');
  if (!user) return errorResponse('Missing ?user=', 400);
  
  const result = await robloxStalk(user);
  return jsonResponse(result);
}

export async function handleTranslate(req, url) {
  const text = url.searchParams.get('text');
  const from = url.searchParams.get('from') || 'auto';
  const to = url.searchParams.get('to') || 'en';
  const mode = url.searchParams.get('mode') || 'text-to-text';
  
  if (!text) return errorResponse('Missing ?text=', 400);
  
  const result = await googleTranslate(text, from, to, mode);
  return jsonResponse(result);
}

export async function handleFaceAge(req, url) {
  const imageUrl = url.searchParams.get('url');
  if (!imageUrl) return errorResponse('Missing ?url= (image URL)', 400);
  
  const result = await faceAgeDetect(imageUrl);
  return jsonResponse(result);
}

export async function handleMangaHome(req, url) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const result = await mangaDistrictList(page === 1 ? MANGA_BASE + '/' : MANGA_BASE + `/page/${page}/`);
  return jsonResponse(result);
}

export async function handleMangaSearch(req, url) {
  const query = url.searchParams.get('q');
  const page = parseInt(url.searchParams.get('page') || '1');
  
  if (!query) return errorResponse('Missing ?q=', 400);
  
  const result = await mangaDistrictList(
    page === 1 
      ? MANGA_BASE + `/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      : MANGA_BASE + `/page/${page}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
  );
  return jsonResponse(result);
}

export async function handleMangaDetail(req, url) {
  const slug = url.searchParams.get('slug');
  if (!slug) return errorResponse('Missing ?slug=', 400);
  
  const result = await mangaDistrictDetail(slug);
  return jsonResponse(result);
}

export async function handleMangaChapter(req, url) {
  const chapterUrl = url.searchParams.get('url');
  if (!chapterUrl) return errorResponse('Missing ?url=', 400);
  
  const result = await mangaDistrictChapter(chapterUrl);
  return jsonResponse(result);
}

// ==================== EXPORT ====================

export default {
  transcribeAudio,
  teraboxDownload,
  shieldnetScan,
  robloxStalk,
  googleTranslate,
  googleTTS,
  faceAgeDetect,
  mangaDistrictList,
  mangaDistrictDetail,
  mangaDistrictChapter,
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
};
