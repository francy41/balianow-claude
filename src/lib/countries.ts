/** Helper: código país ISO → emoji bandera + nombre */

export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  const cc = code.toUpperCase();
  // Convierte 2 letras a emoji regional indicator
  return String.fromCodePoint(...[...cc].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'ES', name: 'España' }, { code: 'MX', name: 'México' }, { code: 'CO', name: 'Colombia' },
  { code: 'AR', name: 'Argentina' }, { code: 'CU', name: 'Cuba' }, { code: 'VE', name: 'Venezuela' },
  { code: 'PE', name: 'Perú' }, { code: 'CL', name: 'Chile' }, { code: 'DO', name: 'Rep. Dominicana' },
  { code: 'BR', name: 'Brasil' }, { code: 'US', name: 'Estados Unidos' }, { code: 'PT', name: 'Portugal' },
  { code: 'FR', name: 'Francia' }, { code: 'IT', name: 'Italia' }, { code: 'DE', name: 'Alemania' },
  { code: 'GB', name: 'Reino Unido' }, { code: 'NL', name: 'Países Bajos' }, { code: 'PL', name: 'Polonia' },
  { code: 'RU', name: 'Rusia' }, { code: 'CN', name: 'China' }, { code: 'JP', name: 'Japón' },
  { code: 'IN', name: 'India' }, { code: 'GH', name: 'Ghana' }, { code: 'SN', name: 'Senegal' },
  { code: 'MA', name: 'Marruecos' }, { code: 'EG', name: 'Egipto' }, { code: 'EC', name: 'Ecuador' },
  { code: 'BO', name: 'Bolivia' }, { code: 'PY', name: 'Paraguay' }, { code: 'UY', name: 'Uruguay' },
  { code: 'CR', name: 'Costa Rica' }, { code: 'PA', name: 'Panamá' }, { code: 'GT', name: 'Guatemala' },
  { code: 'PR', name: 'Puerto Rico' }, { code: 'CA', name: 'Canadá' }, { code: 'AU', name: 'Australia' },
];

export function countryName(code: string): string {
  return COUNTRIES.find(c => c.code === code.toUpperCase())?.name || code;
}
