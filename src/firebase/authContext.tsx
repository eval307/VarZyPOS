// Proxy re-exporting 100% Supabase Auth implementation
export * from '../supabase/supabaseAuthContext';
export {
  useAuth,
  AuthProvider,
  isSessionActiveAndValid,
  updateSessionActivity,
  clearSessionStorage,
  SESSION_MAX_INACTIVITY_MS,
  SESSION_LAST_ACTIVE_KEY,
  SESSION_EXPIRED_NOTICE_KEY,
} from '../supabase/supabaseAuthContext';
export type { UserProfile } from '../supabase/supabaseAuthContext';
