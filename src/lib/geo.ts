/**
 * Geo helpers compartidos:
 * - CITY_COORDS: coordenadas de las ciudades soportadas
 * - resolveCityCoords: lat/lng aproximadas a partir del nombre de ciudad
 * - distanceKm: distancia Haversine
 *
 * Usado por NearMePage, MapPage, ProfileEditModal para garantizar que
 * los perfiles se geo-posicionen aunque el usuario solo escriba la ciudad.
 */

export type LatLng = [number, number];

export const CITY_COORDS: Record<string, LatLng> = {
  'Madrid':         [40.4168,  -3.7038],
  'Barcelona':      [41.3851,   2.1734],
  'Valencia':       [39.4699,  -0.3763],
  'Sevilla':        [37.3891,  -5.9845],
  'Bilbao':         [43.2630,  -2.9350],
  'Málaga':         [36.7213,  -4.4214],
  'Malaga':         [36.7213,  -4.4214],
  'Granada':        [37.1773,  -3.5986],
  'Zaragoza':       [41.6488,  -0.8891],
  'Paris':          [48.8566,   2.3522],
  'París':          [48.8566,   2.3522],
  'Londres':        [51.5074,  -0.1278],
  'London':         [51.5074,  -0.1278],
  'Berlín':         [52.5200,  13.4050],
  'Berlin':         [52.5200,  13.4050],
  'Roma':           [41.9028,  12.4964],
  'Rome':           [41.9028,  12.4964],
  'Milano':         [45.4642,   9.1900],
  'Milán':          [45.4642,   9.1900],
  'Miami':          [25.7617, -80.1918],
  'New York':       [40.7128, -74.0060],
  'Cali':           [ 3.4516, -76.5320],
  'Bogotá':         [ 4.7110, -74.0721],
  'Bogota':         [ 4.7110, -74.0721],
  'Medellín':       [ 6.2476, -75.5658],
  'Medellin':       [ 6.2476, -75.5658],
  'La Habana':      [23.1136, -82.3666],
  'Habana':         [23.1136, -82.3666],
  'Santo Domingo':  [18.4861, -69.9312],
  'Buenos Aires':   [-34.6037, -58.3816],
  'Lima':           [-12.0464, -77.0428],
  'México DF':      [19.4326, -99.1332],
  'Mexico DF':      [19.4326, -99.1332],
  'CDMX':           [19.4326, -99.1332],
};

/** Devuelve lat/lng aproximadas a partir del nombre de ciudad (case-insensitive, sin acentos). */
export function resolveCityCoords(city?: string | null): LatLng | null {
  if (!city) return null;
  const key = city.trim();
  if (CITY_COORDS[key]) return CITY_COORDS[key];

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const target = norm(key);
  for (const [name, coords] of Object.entries(CITY_COORDS)) {
    if (norm(name) === target) return coords;
  }
  return null;
}

/** Distancia Haversine en km entre dos puntos. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const POPULAR_CITIES = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla',
  'Paris', 'Miami', 'New York', 'Cali', 'Medellín', 'La Habana',
];
