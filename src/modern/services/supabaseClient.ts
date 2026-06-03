import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { getFinanCasaConfig } from '../config';

let browserSupabaseClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient() {
  if (browserSupabaseClient) return browserSupabaseClient;

  const config = getFinanCasaConfig();
  browserSupabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });

  return browserSupabaseClient;
}

export async function signInWithPassword(email: string, password: string) {
  return getBrowserSupabaseClient().auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string, name: string) {
  return getBrowserSupabaseClient().auth.signUp({
    email,
    password,
    options: { data: { name, role: 'admin' } }
  });
}

export async function signOut() {
  return getBrowserSupabaseClient().auth.signOut();
}

export function getUserInitials(user?: User | null) {
  const email = user?.email || '';
  const name = String(user?.user_metadata?.name || user?.user_metadata?.full_name || email.split('@')[0] || 'FC');
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'FC';
}

export function getUserName(user?: User | null) {
  const email = user?.email || 'usuario@financasa';
  return String(user?.user_metadata?.name || user?.user_metadata?.full_name || email.split('@')[0] || 'Usuário');
}
