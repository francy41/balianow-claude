// ════════════════════════════════════════════════════════════════
// Geo helpers — coordenadas conocidas + distancias + auto-resolve
// ════════════════════════════════════════════════════════════════

export interface LatLng { lat: number; lng: number }

export const CITY_COORDS: Record<string, LatLng> = {
  'madrid':           { lat: 40.4168, lng: -3.7038 },
  'barcelona':        { lat: 41.3851, lng:  2.1734 },
  'valencia':         { lat: 39.4699, lng: -0.3763 },
  'sevilla':          { lat: 37.3891, lng: -5.9845 },
  'zaragoza':         { lat: 41.6488, lng: -0.8891 },
  'málaga':           { lat: 36.7213, lng: -4.4214 },
  'malaga':           { lat: 36.7213, lng: -4.4214 },
  'bilbao':           { lat: 43.2630, lng: -2.9350 },
  'palma':            { lat: 39.5696, lng:  2.6502 },
  'murcia':           { lat: 37.9922, lng: -1.1307 },
  'granada':          { lat: 37.1773, lng: -3.5986 },
  'alicante':         { lat: 38.3452, lng: -0.4810 },
  'córdoba':          { lat: 37.8882, lng: -4.7794 },
  'cordoba':          { lat: 37.8882, lng: -4.7794 },
  'vigo':             { lat: 42.2406, lng: -8.7207 },
  'gijón':            { lat: 43.5453, lng: -5.6619 },
  'gijon':            { lat: 43.5453, lng: -5.6619 },
  'la coruña':        { lat: 43.3623, lng: -8.4115 },
  'la coruna':        { lat: 43.3623, lng: -8.4115 },
  'a coruña':         { lat: 43.3623, lng: -8.4115 },
  'pamplona':         { lat: 42.8125, lng: -1.6458 },
  'santander':        { lat: 43.4623, lng: -3.8099 },
  'lisboa':           { lat: 38.7223, lng: -9.1393 },
  'porto':            { lat: 41.1579, lng: -8.6291 },
  'parís':            { lat: 48.8566, lng:  2.3522 },
  'paris':            { lat: 48.8566, lng:  2.3522 },
  'roma':             { lat: 41.9028, lng: 12.4964 },
  'milán':            { lat: 45.4642, lng:  9.1900 },
  'milan':            { lat: 45.4642, lng:  9.1900 },
  'berlín':           { lat: 52.5200, lng: 13.4050 },
  'berlin':           { lat: 52.5200, lng: 13.4050 },
  'londres':          { lat: 51.5074, lng: -0.1278 },
  'bruselas':         { lat: 50.8503, lng:  4.3517 },
  'ámsterdam':        { lat: 52.3676, lng:  4.9041 },
  'amsterdam':        { lat: 52.3676, lng:  4.9041 },
  'buenos aires':     { lat: -34.6037, lng: -58.3816 },
  'bogotá':           { lat:   4.7110, lng: -74.0721 },
  'bogota':           { lat:   4.7110, lng: -74.0721 },
  'lima':             { lat: -12.0464, lng: -77.0428 },
  'ciudad de méxico': { lat:  19.4326, lng: -99.1332 },
  'ciudad de mexico': { lat:  19.4326, lng: -99.1332 },
  'cdmx':             { lat:  19.4326, lng: -99.1332 },
  'la habana':        { lat:  23.1136, lng: -82.3666 },
  'caracas':          { lat:  10.4806, lng: -66.9036 },
  'quito':            { lat:  -0.1807, lng: -78.4678 },
  'santiago':         { lat: -33.4489, lng: -70.6693 },
  'san juan':         { lat:  18.4655, lng: -66.1057 },
  'miami':            { lat:  25.7617, lng: -80.1918 },
  'nueva york':       { lat:  40.7128, lng: -74.0060 },
  'new york':         { lat:  40.7128, lng: -74.0060 },
};

/** Devuelve coordenadas de una ciudad conocida (case/acentos/sufijos-insensible).
 *  Acepta variantes como "Madrid, España", "Barcelona - Spain", "Sevilla / Andalucía". */
export function resolveCityCoords(city: string | null | undefined): LatLng | null {
  if (!city) return null;
  // Quitar sufijos de país/región separados por coma, guion o slash
  let key = city.trim().toLowerCase().split(/[,\-\/(]/)[0].trim();
  if (!key) return null;
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  // Probar también la versión sin tildes
  const noAccents = key.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return CITY_COORDS[noAccents] ?? null;
}

/** Distancia en km entre 2 puntos (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Si lat/lng existen úsalos, si no resuelve desde la ciudad. */
export function pointFor(obj: { lat?: number | null; lng?: number | null; city?: string | null }): LatLng | null {
  if (typeof obj.lat === 'number' && typeof obj.lng === 'number') {
    return { lat: obj.lat, lng: obj.lng };
  }
  return resolveCityCoords(obj.city);
}
