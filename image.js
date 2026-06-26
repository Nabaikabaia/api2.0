// image.js - Complete Image Services (Full Power)
// Services: DeepAI Image Editor, Iloveimg Upscaler, Pinterest Search, EzRemove, Photo Enhancer

import { CONFIG } from './config.js';
import {
  randomUUID, randomString, randomIP, md5, sha256,
  sleep, fetchWithRetry, fetchJSON,
  sessionManager, buildHeaders, buildMobileHeaders,
  jsonResponse, errorResponse, successResponse
} from './utils.js';

// ==================== DEEPAI IMAGE EDITOR ====================

export async function deepaiEdit(imageUrl, prompt, options = {}) {
  const { maxRetries = 6 } = options;
  
  try {
    // Generate dynamic API key
    const r = String(Math.floor(Math.random() * 1e11));
    const h1 = reverse(md5(CONFIG.DEEPAI_AGENT + r + CONFIG.DEEPAI_SALT));
    const h2 = reverse(md5(CONFIG.DEEPAI_AGENT + h1));
    const h3 = reverse(md5(CONFIG.DEEPAI_AGENT + h2));
    const apiKey = `tryit-${r}-${h3}`;
    
    // Fetch image from URL
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': CONFIG.UA_MOBILE }
    });
    
    if (!imgRes.ok) {
      return { error: `Failed to fetch image: ${imgRes.status}` };
    }
    
    const imageBuffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.split('/')[1] || 'jpg';
    
    // Build form data
    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer], { type: contentType }), `image.${ext}`);
    formData.append('text', prompt);
    formData.append('image_generator_version', 'standard');
    
    // Make request to DeepAI
    let lastError = null;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(CONFIG.ENDPOINTS.DEEPAI, {
          method: "POST",
          headers: {
            'accept': '*/*',
            'origin': 'https://deepai.org',
            'referer': 'https://deepai.org/',
            'user-agent': CONFIG.DEEPAI_AGENT,
            'api-key': apiKey,
            'x-forwarded-for': randomIP()
          },
          body: formData
        });
        
        const data = await res.json();
        
        if (data?.output_url) {
          const editedRes = await fetch(data.output_url);
          const editedBuffer = await editedRes.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(editedBuffer)));
          
          return {
            success: true,
            original_url: imageUrl,
            edited_url: data.output_url,
            edited_base64: `data:${contentType};base64,${base64}`,
            id: data.id,
            prompt: prompt
          };
        }
        
        lastError = data?.status || `HTTP ${res.status}`;
        await sleep(600);
      } catch (err) {
        lastError = err.message;
        await sleep(600);
      }
    }
    
    return { error: lastError || 'DeepAI edit failed' };
  } catch (error) {
    return { error: error.message };
  }
}

function reverse(s) {
  return s.split('').reverse().join('');
}

// ==================== ILOVEIMG IMAGE UPSCALER ====================

export async function iloveimgUpscale(imageUrl, scale = 4, options = {}) {
  const { maxRetries = 3 } = options;
  
  try {
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': CONFIG.UA_DESKTOP }
    });
    
    if (!imgRes.ok) {
      return { error: `Failed to fetch image: ${imgRes.status}` };
    }
    
    const imageBuffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.split('/')[1] || 'jpg';
    const filename = `image.${ext}`;
    
    const ip = randomIP();
    const headers = {
      'user-agent': CONFIG.UA_DESKTOP,
      'authorization': 'Bearer ' + CONFIG.FALLBACKS.BLACKBOX_FALLBACK_VALIDATED,
      'origin': CONFIG.ENDPOINTS.ILOVEIMG_WEB,
      'referer': CONFIG.ENDPOINTS.ILOVEIMG_WEB + '/',
      'x-forwarded-for': ip,
      'x-real-ip': ip
    };
    
    // Start task
    const startRes = await fetch(`${CONFIG.ENDPOINTS.ILOVEIMG}/start/upscaleimage`, {
      headers: { ...headers, 'accept': 'application/json' }
    });
    const startData = await startRes.json();
    
    if (!startData.server || !startData.task) {
      return { error: 'Failed to start upscale task' };
    }
    
    const api = `https://${startData.server}`;
    
    // Upload image
    const formData = new FormData();
    formData.append('name', filename);
    formData.append('chunk', '0');
    formData.append('chunks', '1');
    formData.append('task', startData.task);
    formData.append('preview', '0');
    formData.append('pdfinfo', '0');
    formData.append('v', 'web.0');
    formData.append('file', new Blob([imageBuffer], { type: contentType }), filename);
    
    const uploadRes = await fetch(`${api}/v1/upload`, {
      method: "POST",
      headers: { ...headers, 'accept': 'application/json' },
      body: formData
    });
    const uploadData = await uploadRes.json();
    
    if (!uploadData.server_filename) {
      return { error: 'Upload failed' };
    }
    
    // Upscale
    const upscaleForm = new FormData();
    upscaleForm.append('task', startData.task);
    upscaleForm.append('server_filename', uploadData.server_filename);
    upscaleForm.append('scale', String(scale));
    
    const upscaleRes = await fetch(`${api}/v1/upscale`, {
      method: "POST",
      headers: { ...headers, 'accept': '*/*' },
      body: upscaleForm
    });
    
    const ct = upscaleRes.headers.get('content-type') || '';
    if (!upscaleRes.ok || !ct.includes('image')) {
      return { error: `Upscale failed: ${upscaleRes.status}` };
    }
    
    const upscaledBuffer = await upscaleRes.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(upscaledBuffer)));
    const dimensions = getImageDimensions(new Uint8Array(upscaledBuffer));
    
    return {
      success: true,
      original_url: imageUrl,
      upscaled_base64: `data:${contentType};base64,${base64}`,
      scale: scale,
      width: dimensions.width,
      height: dimensions.height,
      size: upscaledBuffer.byteLength
    };
  } catch (error) {
    return { error: error.message };
  }
}

function getImageDimensions(buffer) {
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
  if (buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return {
      width: (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19],
      height: (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23]
    };
  }
  return { width: 0, height: 0 };
}

// ==================== PINTEREST SEARCH ====================

export async function pinterestSearch(query, options = {}) {
  const { limit = 10, scope = 'pins' } = options;
  
  try {
    const homeRes = await fetch(CONFIG.ENDPOINTS.PINTEREST, {
      headers: buildHeaders({ 'Accept': 'text/html' })
    });
    const html = await homeRes.text();
    const cookies = homeRes.headers.getSetCookie?.()?.map(c => c.split(';')[0]).join('; ') || '';
    
    const csrfMatch = html.match(/csrftoken=([^;]+)/);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';
    
    const sourceUrl = `/search/${scope}/?q=${encodeURIComponent(query)}`;
    const data = {
      options: {
        query: query,
        scope: scope,
        page_size: limit,
        refine_search_with_filters: true
      },
      context: {}
    };
    
    const url = `${CONFIG.ENDPOINTS.PINTEREST_API}/?source_url=${encodeURIComponent(sourceUrl)}&data=${encodeURIComponent(JSON.stringify(data))}&_=${Date.now()}`;
    
    const res = await fetch(url, {
      headers: {
        'accept': 'application/json, text/javascript, */*',
        'user-agent': CONFIG.UA_DESKTOP,
        'referer': `https://id.pinterest.com${sourceUrl}`,
        'x-requested-with': 'XMLHttpRequest',
        'x-csrftoken': csrfToken,
        'cookie': cookies
      }
    });
    
    const result = await res.json();
    const payload = result?.resource_response?.data;
    
    if (!payload) {
      return { error: 'No results found', results: [] };
    }
    
    const items = Array.isArray(payload) ? payload : payload.results || [];
    
    const results = items.slice(0, limit).map(item => ({
      id: item.id,
      title: item.title || item.grid_title || '',
      description: item.description || '',
      image: item.images?.orig?.url || item.images?.['736x']?.url || null,
      video: item.videos?.video_list?.V_HLSV4?.url || 
              item.videos?.video_list?.V_EXP7?.url || 
              item.videos?.video_list?.V_720P?.url || null,
      width: item.images?.orig?.width || null,
      height: item.images?.orig?.height || null,
      link: item.link || null,
      username: item.pinner?.username || null,
      full_name: item.pinner?.full_name || null,
      pin_url: `https://id.pinterest.com/pin/${item.id}/`,
      is_video: !!(item.videos?.video_list)
    }));
    
    return {
      success: true,
      query: query,
      count: results.length,
      results: results
    };
  } catch (error) {
    return { error: error.message, results: [] };
  }
}

// ==================== PINTEREST PIN DETAIL ====================

export async function pinterestPinDetail(pinId) {
  try {
    const homeRes = await fetch(CONFIG.ENDPOINTS.PINTEREST, {
      headers: buildHeaders({ 'Accept': 'text/html' })
    });
    const cookies = homeRes.headers.getSetCookie?.()?.map(c => c.split(';')[0]).join('; ') || '';
    
    const csrfMatch = await homeRes.text().then(html => html.match(/csrftoken=([^;]+)/));
    const csrfToken = csrfMatch ? csrfMatch[1] : '';
    
    const url = `${CONFIG.ENDPOINTS.PINTEREST_API}/?source_url=/pin/${pinId}/&data=${encodeURIComponent(JSON.stringify({
      options: { pin_id: pinId, field_set_key: 'detailed', no_cache: false },
      context: {}
    }))}&_=${Date.now()}`;
    
    const res = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'user-agent': CONFIG.UA_DESKTOP,
        'x-requested-with': 'XMLHttpRequest',
        'x-csrftoken': csrfToken,
        'cookie': cookies
      }
    });
    
    const result = await res.json();
    const pin = result?.resource_response?.data;
    
    if (!pin) {
      return { error: 'Pin not found' };
    }
    
    return {
      success: true,
      id: pin.id,
      title: pin.title,
      description: pin.description,
      image: pin.images?.orig?.url,
      video: pin.videos?.video_list?.V_HLSV4?.url,
      link: pin.link,
      username: pin.pinner?.username,
      full_name: pin.pinner?.full_name,
      pin_url: `https://id.pinterest.com/pin/${pin.id}/`,
      created_at: pin.created_at,
      repin_count: pin.repin_count,
      like_count: pin.like_count,
      comment_count: pin.comment_count
    };
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== EZREMOVE - WATERMARK/BACKGROUND REMOVER ====================

export async function ezremove(imageUrl) {
  try {
    // Fetch image from URL
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': CONFIG.UA_MOBILE }
    });
    
    if (!imgRes.ok) {
      return { success: false, error: `Failed to fetch image: ${imgRes.status}` };
    }
    
    const imageBuffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.split('/')[1] || 'jpg';
    const filename = `image.${ext}`;
    
    // Build multipart form
    const boundary = `----FormBoundary${Math.random().toString(36).slice(2)}`;
    const bodyParts = [];
    
    bodyParts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="image_file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
    );
    bodyParts.push(imageBuffer);
    bodyParts.push(`\r\n--${boundary}--\r\n`);
    
    const body = new Blob(bodyParts, { type: 'application/octet-stream' });
    
    // Create job
    const createRes = await fetch('https://api.ezremove.ai/api/ez-remove/watermark-remove/create-job', {
      method: 'POST',
      headers: {
        'User-Agent': CONFIG.UA_MOBILE,
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://ezremove.ai',
        'Referer': 'https://ezremove.ai/',
        'product-serial': `sr-${Date.now()}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: body
    });
    
    const createData = await createRes.json();
    const jobId = createData?.result?.job_id;
    
    if (!jobId) {
      return { success: false, error: 'Failed to create job' };
    }
    
    // Poll for completion (up to 30 attempts)
    for (let i = 0; i < 30; i++) {
      await sleep(2000);
      
      const checkRes = await fetch(`https://api.ezremove.ai/api/ez-remove/watermark-remove/get-job/${jobId}`, {
        headers: {
          'User-Agent': CONFIG.UA_MOBILE,
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://ezremove.ai',
          'Referer': 'https://ezremove.ai/',
          'product-serial': `sr-${Date.now()}`
        }
      });
      
      const checkData = await checkRes.json();
      const resultUrl = checkData?.result?.output?.[0];
      
      if (checkData?.code === 100000 && resultUrl) {
        return {
          success: true,
          original_url: imageUrl,
          result_url: resultUrl,
          job_id: jobId
        };
      }
      
      if (checkData?.code !== 300001) {
        return { success: false, error: 'Job failed' };
      }
    }
    
    return { success: false, error: 'Timeout - job taking too long' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== PHOTO ENHANCER (ihancer.com) ====================

export async function photoEnhancer(imageUrl, method = 1) {
  try {
    // Fetch image from URL
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': CONFIG.UA_MOBILE }
    });
    
    if (!imgRes.ok) {
      return { error: `Failed to fetch image: ${imgRes.status}` };
    }
    
    const imageBuffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.split('/')[1] || 'jpg';
    
    // Build form data
    const formData = new FormData();
    formData.append('method', String(method));
    formData.append('is_pro_version', 'true');
    formData.append('is_enhancing_more', 'false');
    formData.append('max_image_size', 'high');
    formData.append('file', new Blob([imageBuffer], { type: contentType }), `file.${ext}`);
    
    // Send to ihancer
    const res = await fetch('https://ihancer.com/api/enhance', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://ihancer.com/app/',
        'Origin': 'https://ihancer.com'
      },
      body: formData
    });
    
    if (!res.ok) {
      return { error: `Enhance failed: ${res.status}` };
    }
    
    const enhancedBuffer = await res.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(enhancedBuffer)));
    
    return {
      success: true,
      original_url: imageUrl,
      enhanced_base64: `data:${contentType};base64,${base64}`,
      method: method,
      size: enhancedBuffer.byteLength
    };
  } catch (error) {
    return { error: error.message };
  }
}

// ==================== ROUTE HANDLERS ====================

export async function handleDeepAI(req, url) {
  const imageUrl = url.searchParams.get('url');
  const prompt = url.searchParams.get('prompt');
  
  if (!imageUrl) return errorResponse('Missing ?url= (image URL)', 400);
  if (!prompt) return errorResponse('Missing ?prompt= (edit description)', 400);
  
  const result = await deepaiEdit(imageUrl, prompt);
  return jsonResponse(result);
}

export async function handleIloveimg(req, url) {
  const imageUrl = url.searchParams.get('url');
  const scale = parseInt(url.searchParams.get('scale') || '4');
  
  if (!imageUrl) return errorResponse('Missing ?url= (image URL)', 400);
  if (scale < 2 || scale > 8) return errorResponse('Scale must be between 2 and 8', 400);
  
  const result = await iloveimgUpscale(imageUrl, scale);
  return jsonResponse(result);
}

export async function handlePinterestSearch(req, url) {
  const query = url.searchParams.get('q');
  if (!query) return errorResponse('Missing ?q=', 400);
  
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
  const result = await pinterestSearch(query, { limit });
  return jsonResponse(result);
}

export async function handlePinterestPin(req, url) {
  const pinId = url.searchParams.get('id');
  if (!pinId) return errorResponse('Missing ?id= (pin ID)', 400);
  
  const result = await pinterestPinDetail(pinId);
  return jsonResponse(result);
}

export async function handleEzRemove(req, url) {
  const imageUrl = url.searchParams.get('url');
  
  if (!imageUrl) return errorResponse('Missing ?url= (image URL)', 400);
  
  const result = await ezremove(imageUrl);
  return jsonResponse(result);
}

export async function handlePhotoEnhancer(req, url) {
  const imageUrl = url.searchParams.get('url');
  const method = parseInt(url.searchParams.get('method') || '1');
  
  if (!imageUrl) return errorResponse('Missing ?url= (image URL)', 400);
  
  const result = await photoEnhancer(imageUrl, method);
  return jsonResponse(result);
}

// ==================== EXPORT ====================

export default {
  deepaiEdit,
  iloveimgUpscale,
  pinterestSearch,
  pinterestPinDetail,
  ezremove,
  photoEnhancer,
  handleDeepAI,
  handleIloveimg,
  handlePinterestSearch,
  handlePinterestPin,
  handleEzRemove,
  handlePhotoEnhancer
};
