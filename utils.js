// utils.js - Complete Utilities with Clean Response Format

import { createHash } from 'node:crypto';
import { CONFIG } from './config.js';

// ==================== CRYPTO & ID GENERATORS ====================

export const randomId = (len = 7) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

export const randomUUID = () => crypto.randomUUID();

export const randomIP = () => Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 254)).join(".");

export const md5 = (s) => createHash("md5").update(typeof s === 'string' ? s : Buffer.from(s)).digest("hex");

export const sha256 = (s) => createHash("sha256").update(typeof s === 'string' ? s : Buffer.from(s)).digest("hex");

export const sha1 = (s) => createHash("sha1").update(typeof s === 'string' ? s : Buffer.from(s)).digest("hex");

export const base64Encode = (obj) => {
  const str = JSON.stringify(obj);
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
};

export const base64Decode = (str) => {
  try {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
};

export const generateRandomHex = (bytes) => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
};

// ==================== AES & RSA ENCRYPTION ====================

export async function aesEncrypt(plain, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'AES-CBC', length: 128 }, false, ['encrypt']
  );
  const iv = encoder.encode(secret.slice(0, 16));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, cryptoKey, encoder.encode(plain));
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

export async function rsaEncrypt(plain, publicKeyPem) {
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  const pemContents = publicKeyPem.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('spki', binaryKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, cryptoKey, new TextEncoder().encode(plain));
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

// ==================== SSE (Server-Sent Events) PARSER ====================

export async function parseSSE(response, options = {}) {
  const { onDelta, onComplete } = options;
  
  if (!response.ok || !response.body) return "";
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullReply = "";
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonStr = line.substring(6);
        if (jsonStr === "[DONE]") continue;
        
        try {
          const data = JSON.parse(jsonStr);
          
          let delta = null;
          if (data.delta) delta = data.delta;
          if (data.choices?.[0]?.delta?.content) delta = data.choices[0].delta.content;
          if (data.content) delta = data.content;
          
          if (delta) {
            fullReply += delta;
            if (onDelta) onDelta(delta);
          }
        } catch (e) {}
      }
    }
  }
  
  if (onComplete) onComplete(fullReply);
  return fullReply.trim();
}

// ==================== FETCH WITH RETRY ====================

export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
      
      lastError = `HTTP ${response.status}`;
      await sleep(1000 * (i + 1));
    } catch (error) {
      lastError = error.message;
      if (i < maxRetries - 1) await sleep(1000 * (i + 1));
    }
  }
  
  throw new Error(`Failed after ${maxRetries} retries: ${lastError}`);
}

export async function fetchJSON(url, options = {}, maxRetries = 3) {
  const response = await fetchWithRetry(url, options, maxRetries);
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

// ==================== SLEEP / DELAY ====================

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== SESSION MANAGER ====================

class SessionManager {
  constructor() {
    this.store = new Map();
  }
  
  get(id) {
    const session = this.store.get(id);
    if (!session) return null;
    
    if (session.expiresAt && Date.now() > session.expiresAt) {
      this.store.delete(id);
      return null;
    }
    
    return session;
  }
  
  set(id, data, ttlMs = CONFIG.LIMITS?.SESSION_TTL_MS || 3600000) {
    this.store.set(id, {
      ...data,
      expiresAt: Date.now() + ttlMs,
      updatedAt: Date.now()
    });
    return id;
  }
  
  create(data, ttlMs = CONFIG.LIMITS?.SESSION_TTL_MS || 3600000) {
    const id = randomUUID();
    this.store.set(id, {
      ...data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now()
    });
    return id;
  }
  
  delete(id) {
    this.store.delete(id);
  }
  
  clear() {
    this.store.clear();
  }
  
  cleanup() {
    const now = Date.now();
    for (const [id, session] of this.store) {
      if (session.expiresAt && now > session.expiresAt) {
        this.store.delete(id);
      }
    }
  }
}

export const sessionManager = new SessionManager();

// ==================== RESPONSE FORMATTERS (CLEAN) ====================

export function jsonResponse(data, status = 200) {
  const response = {
    status: status,
    creator: "NABEES",
    result: data
  };
  
  const jsonString = JSON.stringify(response, null, 2);
  
  return new Response(jsonString, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cookie, Authorization'
    }
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

export function successResponse(data, message = "success") {
  return jsonResponse({ 
    success: true, 
    message, 
    data 
  }, 200);
}

// ==================== URL VALIDATORS ====================

export function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ==================== FORMATTERS ====================

export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== HEADER BUILDERS ====================

export function buildHeaders(customHeaders = {}, cookies = null) {
  const headers = {
    'User-Agent': CONFIG.UA_DESKTOP,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    ...customHeaders
  };
  
  if (cookies) {
    headers['Cookie'] = cookies;
  }
  
  return headers;
}

export function buildMobileHeaders(customHeaders = {}, cookies = null) {
  const headers = {
    'User-Agent': CONFIG.UA_MOBILE,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Ch-Ua-Mobile': '?1',
    ...customHeaders
  };
  
  if (cookies) {
    headers['Cookie'] = cookies;
  }
  
  return headers;
}

// ==================== POLLING UTILITY ====================

export async function poll(fn, options = {}) {
  const {
    maxAttempts = CONFIG.LIMITS?.MAX_POLL_ATTEMPTS || 30,
    interval = CONFIG.LIMITS?.POLL_INTERVAL_MS || 5000,
    onProgress = null
  } = options;
  
  for (let i = 0; i < maxAttempts; i++) {
    const result = await fn(i);
    
    if (onProgress) onProgress(i, result);
    
    if (result && (result.success === true || result.status === 'success' || result.done === true)) {
      return result;
    }
    
    if (result && (result.error || result.status === 'failed')) {
      throw new Error(result.error || 'Polling failed');
    }
    
    if (i < maxAttempts - 1) await sleep(interval);
  }
  
  throw new Error('Polling timeout after ' + maxAttempts + ' attempts');
}

// ==================== IMAGE DIMENSIONS ====================

export function getImageDimensions(buffer) {
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return {
          height: (buffer[offset + 5] << 8) | buffer[offset + 6],
          width: (buffer[offset + 7] << 8) | buffer[offset + 8]
        };
      }
      offset += 2 + ((buffer[offset + 2] << 8) | buffer[offset + 3]);
    }
  }
  
  // PNG
  if (buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return {
      width: (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19],
      height: (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23]
    };
  }
  
  return { width: 0, height: 0 };
}

// ==================== RANDOM STRING GENERATORS ====================

export function randomString(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function randomNumber(min = 100000, max = 999999) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==================== COOKIE MANAGER ====================

export function parseSetCookie(setCookie) {
  if (!setCookie) return null;
  
  const cookies = {};
  const parts = setCookie.split(';');
  
  for (const part of parts) {
    const [key, value] = part.trim().split('=');
    if (key && value) cookies[key] = value;
  }
  
  return cookies;
}

export function mergeCookies(existingCookies, newCookie) {
  const cookieMap = new Map();
  
  if (existingCookies) {
    existingCookies.split('; ').forEach(cookie => {
      const [name, value] = cookie.split('=');
      if (name) cookieMap.set(name, value);
    });
  }
  
  if (newCookie) {
    const [name, value] = newCookie.split('=');
    if (name) cookieMap.set(name, value);
  }
  
  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

// ==================== EXPORT ALL ====================

export default {
  randomId,
  randomUUID,
  randomIP,
  md5,
  sha256,
  sha1,
  base64Encode,
  base64Decode,
  generateRandomHex,
  aesEncrypt,
  rsaEncrypt,
  parseSSE,
  fetchWithRetry,
  fetchJSON,
  sleep,
  sessionManager,
  jsonResponse,
  errorResponse,
  successResponse,
  isValidUrl,
  extractDomain,
  formatDuration,
  formatFileSize,
  buildHeaders,
  buildMobileHeaders,
  poll,
  getImageDimensions,
  randomString,
  randomNumber,
  parseSetCookie,
  mergeCookies
};
