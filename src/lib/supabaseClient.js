// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tdkfxugklrzizccbypqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRka2Z4dWdrbHJ6aXpjY2J5cHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NTQxNTEsImV4cCI6MjA5MzMzMDE1MX0.-GgYC9Hf4J_cHQOM3G9P1MJFf6y3UJwsI6GX1TPiUCM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    // Interceptor global para blindar el modo offline
    fetch: async (url, options) => {
      // Si estamos offline, no disparar petición de red para evitar ERR_INTERNET_DISCONNECTED
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Range': '0-0/0'
          }
        });
      }
      return fetch(url, options);
    }
  }
});