// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tdkfxugklrzizccbypqm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRka2Z4dWdrbHJ6aXpjY2J5cHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NTQxNTEsImV4cCI6MjA5MzMzMDE1MX0.-GgYC9Hf4J_cHQOM3G9P1MJFf6y3UJwsI6GX1TPiUCM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true, // Debe ser true para renovar token al volver de sleep
    detectSessionInUrl: false
  },
  global: {
    fetch: async (url, options) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Lanzar error real de red para que los try/catch activen la cola offline
        throw new TypeError('Network request failed: Device is offline');
      }
      return fetch(url, options);
    }
  }
});