import { useEffect } from 'react';
import { supabase, authService } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';
import type { User } from '../store/appStore';

/**
 * Maps a Supabase profile row to our app User type.
 */
function mapProfile(profile: any, supaId: string): User {
  return {
    id: supaId,
    name: profile.name || '',
    email: profile.email || '',
    avatar: profile.avatar || '',
    coverPhoto: profile.cover_photo || '',
    bio: profile.bio || '',
    phone: profile.phone || '',
    role: profile.role || 'user',
    city: profile.city || 'Madrid',
    country: profile.country || '',
    isVerified: profile.is_verified || false,
    isPremium: profile.is_premium || false,
    subscriptionPlan: profile.subscription_plan || undefined,
    wallet: parseFloat(profile.wallet) || 0,
    notifications: profile.notifications || 0,
    socials: profile.socials || {},
  };
}

/**
 * Hook: listens to Supabase auth state and syncs with Zustand store.
 * Place <SupabaseAuthProvider /> once in App.tsx.
 */
export function useSupabaseAuthListener() {
  const { updateUser } = useAuthStore();

  useEffect(() => {
    // Check existing session on mount
    const init = async () => {
      const session = await authService.getSession();
      if (session?.user) {
        const { data: profile } = await authService.getProfile(session.user.id);
        if (profile) {
          const user = mapProfile(profile, session.user.id);
          useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
        }
      }
    };
    init();

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = authService.onAuthChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await authService.getProfile(session.user.id);
        if (profile) {
          const user = mapProfile(profile, session.user.id);
          useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
        }
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);
}

/**
 * Supabase-powered login (replaces mock).
 */
export async function supabaseLogin(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await authService.signIn(email, password);
  if (error) return { success: false, error: error.message };
  if (data.user) {
    const { data: profile } = await authService.getProfile(data.user.id);
    if (profile) {
      const user = mapProfile(profile, data.user.id);
      useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
    }
  }
  return { success: true };
}

/**
 * Supabase-powered register.
 */
export async function supabaseRegister(
  email: string,
  password: string,
  meta?: { name?: string; role?: string; city?: string }
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await authService.signUp(email, password, meta);
  if (error) return { success: false, error: error.message };
  // Profile is auto-created via DB trigger
  return { success: true };
}

/**
 * Supabase logout.
 */
export async function supabaseLogout(): Promise<void> {
  await authService.signOut();
  useAuthStore.setState({ user: null, isAuthenticated: false });
}
