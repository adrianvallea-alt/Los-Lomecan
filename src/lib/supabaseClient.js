import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tdkfxugklrzizccbypqm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRka2Z4dWdrbHJ6aXpjY2J5cHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NTQxNTEsImV4cCI6MjA5MzMzMDE1MX0.-GgYC9Hf4J_cHQOM3G9P1MJFf6y3UJwsI6GX1TPiUCM'; // tu key anónima

export const supabase = createClient(supabaseUrl, supabaseAnonKey);