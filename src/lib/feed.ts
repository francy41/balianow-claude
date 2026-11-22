import { supabase } from './supabase';

// ── Feed social ─────────────────────────────────────────────────────────────
// Capa de datos del muro de publicaciones. Las reglas de quién ve qué viven en
// el RLS de Postgres, no aquí: este archivo solo pide y ordena.
//
// Las publicaciones se guardan en `posts`, que ya existía vacía. Sus columnas
// tienen nombres heredados que no se cambian para no romper nada:
//   content → el texto    ·    city → el lugar    ·    likes → nº de me gusta

export type MediaItem = { url: string; kind: 'image' | 'video' };

export type Post = {
  id: string;
  autorId: string;
  autor: string;
  avatar: string;
  esLocal: boolean;
  localNombre: string | null;
  localId: string | null;
  media: MediaItem[];
  texto: string;
  lugar: string;
  likes: number;
  comentarios: number;
  creado: string;
  leDiLike: boolean;
};

export type Comentario = {
  id: string;
  userId: string;
  autor: string;
  avatar: string;
  texto: string;
  creado: string;
  esMio: boolean;
};

const COLS = 'id, user_id, venue_id, media, media_url, content, city, likes, comments_count, created_at';

// Normaliza una fila cruda. `media_url` es el formato antiguo de una sola
// imagen; se convierte a la lista para que la pantalla no tenga que saberlo.
function aMedia(fila: any): MediaItem[] {
  const lista = Array.isArray(fila.media) ? fila.media : [];
  const limpia: MediaItem[] = lista
    .filter((m: any) => m && typeof m.url === 'string')
    .map((m: any) => ({ url: m.url, kind: m.kind === 'video' ? 'video' : 'image' }));
  if (limpia.length === 0 && fila.media_url) {
    limpia.push({ url: fila.media_url, kind: /\.(mp4|webm|mov)(\?|$)/i.test(fila.media_url) ? 'video' : 'image' });
  }
  return limpia;
}

type Perfil = { id: string; full_name: string | null; avatar_url: string | null };
type Local = { id: string; name: string | null; avatar: string | null };

async function enriquecer(filas: any[], miId?: string): Promise<Post[]> {
  if (filas.length === 0) return [];

  const idsAutores = [...new Set(filas.map(f => f.user_id).filter(Boolean))];
  const idsLocales = [...new Set(filas.map(f => f.venue_id).filter(Boolean))];

  // Una consulta por tipo, no una por publicación.
  const [{ data: perfiles }, { data: locales }, { data: misLikes }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url').in('id', idsAutores),
    idsLocales.length
      ? supabase.from('venues').select('id, name, avatar').in('id', idsLocales)
      : Promise.resolve({ data: [] as Local[] }),
    miId
      ? supabase.from('post_likes').select('post_id').eq('user_id', miId).in('post_id', filas.map(f => f.id))
      : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);

  const porPerfil = new Map((perfiles as Perfil[] ?? []).map(p => [p.id, p]));
  const porLocal = new Map((locales as Local[] ?? []).map(v => [v.id, v]));
  const gustados = new Set((misLikes as { post_id: string }[] ?? []).map(l => l.post_id));

  return filas.map(f => {
    const perfil = porPerfil.get(f.user_id);
    const local = f.venue_id ? porLocal.get(f.venue_id) : undefined;
    return {
      id: f.id,
      autorId: f.user_id,
      // Si va en nombre de un local, manda el nombre del local en la cabecera.
      autor: local?.name || perfil?.full_name || 'Bailarín/a',
      avatar: local?.avatar || perfil?.avatar_url || '',
      esLocal: !!local,
      localNombre: local?.name ?? null,
      localId: f.venue_id ?? null,
      media: aMedia(f),
      texto: f.content || '',
      lugar: f.city || '',
      likes: Number(f.likes) || 0,
      comentarios: Number(f.comments_count) || 0,
      creado: f.created_at,
      leDiLike: gustados.has(f.id),
    };
  });
}

// `antesDe` pagina por fecha en lugar de por número de página: con un feed que
// crece por arriba, saltar de página duplica o se salta publicaciones.
export async function cargarFeed(opts: {
  miId?: string;
  antesDe?: string;
  soloSeguidos?: boolean;
  autorId?: string;
  localId?: string;
  limite?: number;
}): Promise<Post[]> {
  const limite = opts.limite ?? 12;
  let q = supabase.from('posts').select(COLS).is('deleted_at', null);

  if (opts.autorId) q = q.eq('user_id', opts.autorId);
  if (opts.localId) q = q.eq('venue_id', opts.localId);
  if (opts.antesDe) q = q.lt('created_at', opts.antesDe);

  if (opts.soloSeguidos && opts.miId) {
    const [{ data: gente }, { data: sitios }] = await Promise.all([
      supabase.from('user_follows').select('following_id').eq('follower_id', opts.miId),
      supabase.from('venue_follows').select('venue_id').eq('user_id', opts.miId),
    ]);
    const autores = (gente ?? []).map((f: any) => f.following_id);
    const locales = (sitios ?? []).map((f: any) => f.venue_id);
    if (autores.length === 0 && locales.length === 0) return [];
    const partes: string[] = [];
    if (autores.length) partes.push(`user_id.in.(${autores.join(',')})`);
    if (locales.length) partes.push(`venue_id.in.(${locales.join(',')})`);
    q = q.or(partes.join(','));
  }

  const { data, error } = await q.order('created_at', { ascending: false }).limit(limite);
  if (error) throw error;
  return enriquecer(data ?? [], opts.miId);
}

export async function publicar(p: {
  miId: string;
  media: MediaItem[];
  texto: string;
  lugar?: string;
  localId?: string | null;
}) {
  const tipo = p.media.some(m => m.kind === 'video') ? 'video' : p.media.length ? 'image' : 'text';
  const { error } = await supabase.from('posts').insert({
    user_id: p.miId,
    venue_id: p.localId || null,
    media: p.media,
    media_url: p.media[0]?.url ?? null,
    content: p.texto.trim() || null,
    city: p.lugar?.trim() || null,
    type: tipo,
  });
  if (error) throw error;
}

// Devuelve el nuevo estado para que la pantalla no tenga que recargar el feed.
export async function alternarLike(postId: string, miId: string, teníaLike: boolean): Promise<boolean> {
  if (teníaLike) {
    const { error } = await supabase.from('post_likes').delete()
      .eq('post_id', postId).eq('user_id', miId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: miId });
  // 23505: ya estaba dado. No es un fallo, solo dos pulsaciones seguidas.
  if (error && (error as any).code !== '23505') throw error;
  return true;
}

export async function cargarComentarios(postId: string, miId?: string): Promise<Comentario[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('id, user_id, text, created_at')
    .eq('post_id', postId).is('deleted_at', null)
    .order('created_at', { ascending: true }).limit(200);
  if (error) throw error;

  const filas = data ?? [];
  if (filas.length === 0) return [];
  const ids = [...new Set(filas.map((c: any) => c.user_id))];
  const { data: perfiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids);
  const porId = new Map((perfiles as Perfil[] ?? []).map(p => [p.id, p]));

  return filas.map((c: any) => ({
    id: c.id,
    userId: c.user_id,
    autor: porId.get(c.user_id)?.full_name || 'Bailarín/a',
    avatar: porId.get(c.user_id)?.avatar_url || '',
    texto: c.text,
    creado: c.created_at,
    esMio: c.user_id === miId,
  }));
}

export async function comentar(postId: string, miId: string, texto: string) {
  const { error } = await supabase.from('post_comments')
    .insert({ post_id: postId, user_id: miId, text: texto.trim() });
  if (error) throw error;
}

// Los comentarios se retiran marcando la fecha, no borrando la fila: así el
// contador se mantiene solo y queda rastro para moderación.
export async function retirarComentario(id: string) {
  const { error } = await supabase.from('post_comments')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function borrarPost(id: string) {
  const { error } = await supabase.from('posts')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function sigoA(miId: string, otroId: string): Promise<boolean> {
  const { data } = await supabase.from('user_follows')
    .select('follower_id').eq('follower_id', miId).eq('following_id', otroId).maybeSingle();
  return !!data;
}

export async function alternarSeguir(miId: string, otroId: string, seguía: boolean): Promise<boolean> {
  if (seguía) {
    await supabase.from('user_follows').delete()
      .eq('follower_id', miId).eq('following_id', otroId);
    return false;
  }
  const { error } = await supabase.from('user_follows')
    .insert({ follower_id: miId, following_id: otroId });
  if (error && (error as any).code !== '23505') throw error;
  return true;
}

export async function contarSeguidores(userId: string): Promise<{ seguidores: number; siguiendo: number }> {
  const [a, b] = await Promise.all([
    supabase.from('user_follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('user_follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { seguidores: a.count ?? 0, siguiendo: b.count ?? 0 };
}
