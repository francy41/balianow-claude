import { useEffect } from 'react';
import { supabase, authService } from '../lib/supabase';
import { useAuthStore } from '../store/appStore';
import { setSentryUser } from '../lib/sentry';
import type { User } from '../store/appStore';

// ── Profile mapper ─────────────────────────────────────────────────────────
function mapProfile(profile: any, supaId: string): User {
  return {
    id: supaId,
    name:      profile.full_name   || profile.name   || '',
    email:     profile.email       || '',
    avatar:    profile.avatar_url  || profile.avatar  || '',
    coverPhoto: profile.cover_photo || '',
    bio:       profile.bio         || '',
    phone:     profile.whatsapp    || profile.phone   || '',
    role:      (profile.role as any) || 'user',
    city:      profile.location    || profile.city    || 'Madrid',
    country:   profile.country     || '',
    isVerified: profile.verified   ?? profile.is_verified ?? false,
    isPremium:  profile.is_premium || false,
    subscriptionPlan: profile.subscription_plan || undefined,
    wallet:    parseFloat(profile.wallet_balance ?? profile.wallet ?? 0) || 0,
    notifications: profile.notifications || 0,
    // Map individual social columns back to socials object
    socials: {
      instagram:  profile.instagram_url  || profile.socials?.instagram  || '',
      tiktok:     profile.tiktok_url     || profile.socials?.tiktok     || '',
      youtube:    profile.youtube_url    || profile.socials?.youtube     || '',
      website:    profile.website_url    || profile.socials?.website     || '',
      facebook:   profile.facebook_url   || profile.socials?.facebook    || '',
      soundcloud: profile.soundcloud_url || profile.socials?.soundcloud  || '',
      twitch:     profile.twitch_url     || profile.socials?.twitch      || '',
      spotify:    profile.spotify_url    || profile.socials?.spotify     || '',
    },
  };
}

// ── Resolve user after a Supabase session ──────────────────────────────────
// Handles both email/password users and OAuth (Google) users.
// Google users: Supabase auto-creates auth.users, DB trigger creates profiles row.
// We retry a few times since the trigger may have slight delay.
async function resolveUser(supaId: string, email: string, oauthMeta?: {
  name?: string;
  avatar?: string;
}): Promise<User | null> {
  // Try to fetch existing profile (up to 3 attempts for trigger delay)
  for (let i = 0; i < 3; i++) {
    const { data: profile } = await authService.getProfile(supaId);
    if (profile) return mapProfile(profile, supaId);
    // Wait 800ms between attempts (trigger propagation)
    if (i < 2) await new Promise(r => setTimeout(r, 800));
  }

  // Profile not found (trigger may not exist yet) — create it manually
  const fallback = {
    id:           supaId,
    full_name:    oauthMeta?.name || email.split('@')[0],
    email,
    avatar_url:   oauthMeta?.avatar || '',
    role:         'user',
    location:     'Madrid',
    verified:     true,
    status:       'active',
    wallet_balance: 0,
  };

  const { error } = await supabase.from('profiles').upsert(fallback, { onConflict: 'id' });
  if (!error) return mapProfile(fallback, supaId);

  return null;
}

// ── Safe wrapper: resolveUser NUNCA debe colgar la app ─────────────────────
// Si la consulta a `profiles` se cuelga, resolveUser podría no resolver jamás y
// dejar la app en "cargando" para siempre (arranque con sesión previa) o el
// login/refresco a medias. Esta versión corre una carrera con un timeout: si el
// perfil no llega en 6s, devuelve null y el llamador usa el fallback de sesión.
async function resolveUserSafe(supaId: string, email: string, oauthMeta?: {
  name?: string;
  avatar?: string;
}): Promise<User | null> {
  return Promise.race([
    resolveUser(supaId, email, oauthMeta),
    new Promise<User | null>(res => setTimeout(() => res(null), 6000)),
  ]);
}

// ── Auth state listener (App-level, runs once) ─────────────────────────────
export function useSupabaseAuthListener() {
  const { updateUser } = useAuthStore();

  useEffect(() => {
    // Restore existing session on mount
    const init = async () => {
      try {
        const session = await authService.getSession();
        console.log('[auth] init session:', session?.user?.id || 'none');
        if (session?.user) {
          const meta = session.user.user_metadata;
          let user = await resolveUserSafe(
            session.user.id,
            session.user.email ?? '',
            { name: meta?.full_name || meta?.name, avatar: meta?.avatar_url || meta?.picture }
          );
          // Fallback: si profile falló, crear user mínimo desde la sesión
          if (!user) {
            console.warn('[auth] resolveUser failed, using session fallback');
            user = {
              id: session.user.id,
              name: meta?.full_name || meta?.name || (session.user.email || 'Usuario').split('@')[0],
              email: session.user.email || '',
              avatar: meta?.avatar_url || meta?.picture || '',
              coverPhoto: '',
              bio: '',
              phone: '',
              role: 'user',
              city: 'Madrid',
              country: '',
              isVerified: true,
              isPremium: false,
              wallet: 0,
              notifications: 0,
              socials: { instagram:'', tiktok:'', youtube:'', website:'', facebook:'', soundcloud:'', twitch:'', spotify:'' },
            } as any;
          }
          useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
        } else {
          useAuthStore.setState({ isLoading: false });
        }
      } catch (e) {
        console.error('[auth] init error:', e);
        useAuthStore.setState({ isLoading: false });
      }
    };
    init();

    // Listen for all auth events
    const { data: { subscription } } = authService.onAuthChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const meta = session.user.user_metadata;
        let user = await resolveUserSafe(
          session.user.id,
          session.user.email ?? '',
          { name: meta?.full_name || meta?.name, avatar: meta?.avatar_url || meta?.picture }
        );
        if (!user) {
          user = {
            id: session.user.id,
            name: meta?.full_name || meta?.name || (session.user.email || 'Usuario').split('@')[0],
            email: session.user.email || '',
            avatar: meta?.avatar_url || meta?.picture || '',
            coverPhoto: '', bio: '', phone: '', role: 'user', city: 'Madrid', country: '',
            isVerified: true, isPremium: false, wallet: 0, notifications: 0,
            socials: { instagram:'', tiktok:'', youtube:'', website:'', facebook:'', soundcloud:'', twitch:'', spotify:'' },
          } as any;
        }
        useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
        if (user) setSentryUser({ id: user.id, email: user.email, name: user.name });

      } else if (event === 'SIGNED_OUT') {
        useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
        setSentryUser(null);

      } else if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link in their email — redirect to the reset form
        // The session is set temporarily so they can call updateUser
        useAuthStore.setState({ isLoading: false });

      } else if (event === 'USER_UPDATED') {
        // After password update or email confirmation
        if (session?.user) {
          const meta = session.user.user_metadata;
          const user = await resolveUserSafe(
            session.user.id,
            session.user.email ?? '',
            { name: meta?.full_name || meta?.name, avatar: meta?.avatar_url }
          );
          if (user) useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
        }
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);
}

// ── Public auth functions ──────────────────────────────────────────────────

/** Email + password login. Returns success flag. */
export async function supabaseLogin(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> {
  // Timeout duro sobre la propia autenticación: si la red/Supabase se cuelga,
  // devolvemos error en 12s en vez de dejar el login "pensando" para siempre.
  const signInResult = await Promise.race([
    authService.signIn(email, password),
    new Promise<{ data: any; error: any }>(res =>
      setTimeout(() => res({ data: { user: null }, error: { message: 'Tiempo de espera agotado. Revisa tu conexión e inténtalo de nuevo.' } }), 12000)
    ),
  ]);
  const { data, error } = signInResult;
  if (error) {
    // Supabase returns this when email_confirm is required
    if (error.message?.toLowerCase().includes('email not confirmed')) {
      return { success: false, error: error.message, needsVerification: true };
    }
    return { success: false, error: error.message };
  }
  if (data.user) {
    const meta = data.user.user_metadata;
    // Resiliencia: si cargar el perfil se cuelga/tarda >5s, entrar igual con los datos de la sesión.
    let user = await Promise.race([
      resolveUser(data.user.id, data.user.email ?? '', { name: meta?.full_name || meta?.name, avatar: meta?.avatar_url }),
      new Promise<User | null>(res => setTimeout(() => res(null), 5000)),
    ]);
    if (!user) {
      user = {
        id: data.user.id,
        name: meta?.full_name || meta?.name || (data.user.email || 'Usuario').split('@')[0],
        email: data.user.email || '', avatar: meta?.avatar_url || '', coverPhoto: '', bio: '', phone: '',
        role: 'user', city: 'Madrid', country: '', isVerified: true, isPremium: false,
        wallet: 0, notifications: 0,
        socials: { instagram: '', tiktok: '', youtube: '', website: '', facebook: '', soundcloud: '', twitch: '', spotify: '' },
      } as any;
    }
    useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
  }
  return { success: true };
}

/** Trigger Google OAuth redirect. */
export async function supabaseLoginWithGoogle(): Promise<{ success: boolean; error?: string }> {
  const { error } = await authService.signInWithGoogle();
  if (error) return { success: false, error: error.message };
  // Redirect happens automatically — browser navigates away
  return { success: true };
}

/** Register new user. Returns needsVerification=true when email confirm is on. */
export async function supabaseRegister(
  email: string,
  password: string,
  meta?: { name?: string; role?: string; city?: string }
): Promise<{ success: boolean; error?: string; needsVerification?: boolean; hasSession?: boolean }> {
  const { data, error } = await authService.signUp(email, password, meta);
  if (error) return { success: false, error: error.message };

  // Si Supabase devolvió sesión (autoconfirm ON) → el usuario ya está dentro
  const hasSession = !!data.session?.access_token;

  // Solo pedir verificación si NO hay sesión Y identities está vacío
  const needsVerification =
    !hasSession &&
    data.user?.identities !== undefined &&
    data.user.identities.length === 0;

  return { success: true, needsVerification, hasSession };
}

/** Send password reset email. */
export async function supabaseResetPassword(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await authService.resetPassword(email);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Set a new password (used from the reset link page). */
export async function supabaseUpdatePassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await authService.updatePassword(newPassword);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Resend the signup confirmation email. */
export async function supabaseResendVerification(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await authService.resendVerification(email);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Sign out and clear local state. */
export async function supabaseLogout(): Promise<void> {
  await authService.signOut();
  useAuthStore.setState({ user: null, isAuthenticated: false });
}
