// worker.js - Main Entry Point for Cloudflare Workers
// Nabees AI Gateway - Complete API Gateway for AI, Music, Video, Image, and Tools

import { handleRequest, handleOptions } from './routes.js';
import { jsonResponse } from './utils.js';

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    
    const url = new URL(request.url);
    const path = url.pathname;
    
    try {
      // Pass the request to our router
      return await handleRequest(request, url, path);
      
    } catch (error) {
      console.error(`Error processing ${request.method} ${path}:`, error);
      
      // Return a friendly error response
      return jsonResponse({
        success: false,
        error: 'Internal Server Error',
        message: error.message,
        path: path,
        method: request.method,
        timestamp: Date.now()
      }, 500);
    }
  }
};
