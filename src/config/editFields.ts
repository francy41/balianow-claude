// Configuración central de campos editables por entidad.
// Claves en snake_case = columnas reales de la BD (rellenado y guardado directos).
// Usado por el panel admin (AdminPage) y por el botón de edición en las páginas de detalle.
import type { EditField } from '../components/AdminEditModal';

const STATUS_FIELD: EditField = {
  key: 'admin_status', label: 'Estado', type: 'select', options: [
    { value: 'approved', label: 'Aprobado (visible)' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'hidden', label: 'Oculto' },
  ],
};

export const FIELDS_EVENT: EditField[] = [
  { key: 'title', label: 'Título', type: 'text', required: true, cols: 2 },
  { key: 'description', label: 'Descripción', type: 'textarea', cols: 2 },
  { key: 'date', label: 'Fecha', type: 'date' },
  { key: 'time', label: 'Hora inicio', type: 'text', placeholder: '22:00' },
  { key: 'end_time', label: 'Hora fin', type: 'text', placeholder: '05:00' },
  { key: 'type', label: 'Tipo', type: 'select', options: [
      { value: 'Social', label: 'Social' }, { value: 'Taller', label: 'Taller' }, { value: 'Congreso', label: 'Congreso' },
    ] },
  { key: 'category', label: 'Categoría', type: 'text' },
  { key: 'city', label: 'Ciudad', type: 'text' },
  { key: 'country', label: 'País', type: 'text' },
  { key: 'location', label: 'Dirección / lugar', type: 'text', cols: 2 },
  { key: 'venue_name', label: 'Nombre del local', type: 'text' },
  { key: 'price', label: 'Precio (€)', type: 'number' },
  { key: 'price_original', label: 'Precio original (€)', type: 'number' },
  { key: 'currency', label: 'Moneda', type: 'text', placeholder: 'EUR' },
  { key: 'capacity', label: 'Aforo', type: 'number' },
  { key: 'attending', label: 'Asistentes', type: 'number' },
  { key: 'artists', label: 'Artistas', type: 'tags', helper: 'Separados por comas' },
  { key: 'image_url', label: 'Imagen / cartel', type: 'image' },
  { key: 'cover', label: 'Portada', type: 'image' },
  { key: 'is_featured', label: 'Destacado', type: 'checkbox' },
  { key: 'is_premium', label: 'Premium', type: 'checkbox' },
  { key: 'is_online', label: 'Online', type: 'checkbox' },
  STATUS_FIELD,
];

export const FIELDS_ARTIST: EditField[] = [
  { key: 'name', label: 'Nombre', type: 'text', required: true, cols: 2 },
  { key: 'type', label: 'Tipo', type: 'select', options: [
      { value: 'dj', label: 'DJ' }, { value: 'dancer', label: 'Bailarín/a' },
      { value: 'singer', label: 'Cantante' }, { value: 'band', label: 'Banda' },
      { value: 'instructor', label: 'Instructor/a' },
    ] },
  { key: 'bio', label: 'Biografía', type: 'textarea', cols: 2 },
  { key: 'city', label: 'Ciudad', type: 'text' },
  { key: 'country', label: 'País', type: 'text' },
  { key: 'avatar', label: 'Foto de perfil', type: 'image' },
  { key: 'cover', label: 'Portada', type: 'image' },
  { key: 'genre', label: 'Géneros', type: 'tags', helper: 'Separados por comas' },
  { key: 'tags', label: 'Tags', type: 'tags', helper: 'Separados por comas' },
  { key: 'languages', label: 'Idiomas', type: 'tags' },
  { key: 'performance_style', label: 'Estilo de actuación', type: 'text' },
  { key: 'price_from', label: 'Precio desde (€)', type: 'number' },
  { key: 'currency', label: 'Moneda', type: 'text', placeholder: 'EUR' },
  { key: 'rating', label: 'Rating', type: 'number' },
  { key: 'reviews', label: 'Nº reseñas', type: 'number' },
  { key: 'followers', label: 'Seguidores', type: 'number' },
  { key: 'response_time', label: 'Tiempo de respuesta', type: 'text', placeholder: '< 1 hora' },
  { key: 'featured_video', label: 'Vídeo destacado (URL)', type: 'text' },
  { key: 'featured_video_title', label: 'Título del vídeo', type: 'text' },
  { key: 'is_verified', label: 'Verificado', type: 'checkbox' },
  { key: 'is_premium', label: 'Premium (PRO)', type: 'checkbox' },
  { key: 'is_live', label: 'En directo', type: 'checkbox' },
];

export const FIELDS_VENUE: EditField[] = [
  { key: 'name', label: 'Nombre', type: 'text', required: true, cols: 2 },
  { key: 'type', label: 'Tipo', type: 'select', options: [
      { value: 'club', label: 'Club' }, { value: 'bar', label: 'Bar' },
      { value: 'studio', label: 'Estudio' }, { value: 'rooftop', label: 'Rooftop' },
      { value: 'lounge', label: 'Lounge' }, { value: 'restaurante', label: 'Restaurante' },
      { value: 'academia', label: 'Academia' }, { value: 'social', label: 'Social' },
    ] },
  { key: 'description', label: 'Descripción', type: 'textarea', cols: 2 },
  { key: 'city', label: 'Ciudad', type: 'text' },
  { key: 'country', label: 'País', type: 'text' },
  { key: 'address', label: 'Dirección', type: 'text', cols: 2 },
  { key: 'zip_code', label: 'Código postal', type: 'text' },
  { key: 'image_url', label: 'Imagen', type: 'image' },
  { key: 'cover', label: 'Portada', type: 'image' },
  { key: 'avatar', label: 'Logo', type: 'image' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'whatsapp', label: 'WhatsApp', type: 'text' },
  { key: 'map_link', label: 'Enlace mapa', type: 'text', cols: 2 },
  { key: 'open_time', label: 'Hora apertura', type: 'text', placeholder: '20:00' },
  { key: 'close_time', label: 'Hora cierre', type: 'text', placeholder: '05:00' },
  { key: 'open_hours', label: 'Horario (texto)', type: 'text', cols: 2 },
  { key: 'operating_days', label: 'Días de apertura', type: 'text' },
  { key: 'capacity', label: 'Aforo', type: 'number' },
  { key: 'price_level', label: 'Nivel de precio (1-4)', type: 'number' },
  { key: 'price_range', label: 'Rango de precio', type: 'text' },
  { key: 'rating', label: 'Rating', type: 'number' },
  { key: 'reviews', label: 'Nº reseñas', type: 'number' },
  { key: 'style', label: 'Estilos', type: 'tags' },
  { key: 'amenities', label: 'Servicios/Amenities', type: 'tags' },
  { key: 'is_open', label: 'Abierto ahora', type: 'checkbox' },
  { key: 'is_premium', label: 'Premium', type: 'checkbox' },
  STATUS_FIELD,
];

export const FIELDS_SERVICE: EditField[] = [
  { key: 'title', label: 'Título del servicio', type: 'text', required: true, cols: 2 },
  { key: 'description', label: 'Descripción', type: 'textarea', cols: 2 },
  { key: 'category', label: 'Categoría', type: 'text' },
  { key: 'artist_name', label: 'Vendedor / artista', type: 'text' },
  { key: 'price', label: 'Precio (€)', type: 'number' },
  { key: 'price_base', label: 'Precio base (€)', type: 'number' },
  { key: 'currency', label: 'Moneda', type: 'text', placeholder: 'EUR' },
  { key: 'delivery_days', label: 'Plazo (días)', type: 'number' },
  { key: 'cover', label: 'Portada', type: 'image' },
  { key: 'image_url', label: 'Imagen', type: 'image' },
  { key: 'artist_avatar', label: 'Avatar del vendedor', type: 'image' },
  { key: 'tags', label: 'Tags', type: 'tags' },
  { key: 'includes', label: 'Incluye', type: 'tags', helper: 'Cada punto separado por comas' },
  { key: 'rating', label: 'Rating', type: 'number' },
  { key: 'reviews', label: 'Nº reseñas', type: 'number' },
  { key: 'orders', label: 'Pedidos', type: 'number' },
  { key: 'verified', label: 'Verificado', type: 'checkbox' },
  STATUS_FIELD,
];

// Mapa entidad de detalle -> tabla + config de campos, para el boton de edicion admin.
export const DETAIL_EDIT: Record<string, { table: string; entity: 'artist' | 'event' | 'venue' | 'service'; fields: EditField[] }> = {
  event:   { table: 'events',   entity: 'event',   fields: FIELDS_EVENT },
  artist:  { table: 'artists',  entity: 'artist',  fields: FIELDS_ARTIST },
  venue:   { table: 'venues',   entity: 'venue',   fields: FIELDS_VENUE },
  service: { table: 'services', entity: 'service', fields: FIELDS_SERVICE },
};
