import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://bxciizkldjbrjijxrjzl.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4Y2lpemtsZGpicmppanhyanpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxNzg0NzEsImV4cCI6MjEwOTc1NDQ3MX0.eiYh98rv8M-yhmTmVU9se0g6yFaZZVyUOa3yf-kPXDU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
