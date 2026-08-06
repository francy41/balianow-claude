// Repara "mojibake": acentos que se guardaron con doble codificación UTF-8→Latin1
// y se ven como "DesirÃ©e" en vez de "Desirée". Solo sustituye las secuencias
// rotas CONOCIDAS, así que es seguro sobre texto ya correcto (no lo altera).
// IMPORTANTE: primero las secuencias de 2+ caracteres; al final las sueltas (Ã, Â),
// para que la regla suelta no consuma la primera letra de una secuencia larga.
const MOJIBAKE_MAP: [RegExp, string][] = [
  // minúsculas acentuadas
  [/Ã¡/g, 'á'], [/Ã©/g, 'é'], [/Ã­/g, 'í'], [/Ã³/g, 'ó'], [/Ãº/g, 'ú'], [/Ã¼/g, 'ü'],
  [/Ã±/g, 'ñ'], [/Ã¨/g, 'è'], [/Ã¬/g, 'ì'], [/Ã²/g, 'ò'], [/Ã¹/g, 'ù'], [/Ã§/g, 'ç'],
  // MAYÚSCULAS acentuadas
  [/Ã‘/g, 'Ñ'], [/Ã‰/g, 'É'], [/Ã“/g, 'Ó'], [/Ãš/g, 'Ú'], [/Ã‡/g, 'Ç'], [/Ã€/g, 'À'],
  [/Ã/g, 'Á'], [/Ã/g, 'Í'],
  // comillas/guiones tipográficos
  [/â€œ/g, '“'], [/â€/g, '”'], [/â€™/g, '’'], [/â€˜/g, '‘'],
  [/â€“/g, '–'], [/â€”/g, '—'], [/â€¦/g, '…'],
  // signos con Â
  [/Â¡/g, '¡'], [/Â¿/g, '¿'], [/Âº/g, 'º'], [/Âª/g, 'ª'],
  // sueltas — SIEMPRE al final
  [/Ã/g, 'Á'], [/Â/g, ''],
];

export function fixText(s: unknown): string {
  if (typeof s !== 'string' || !s) return (typeof s === 'string' ? s : '');
  // Atajo: si no contiene marcadores típicos de mojibake, devolver tal cual.
  if (!/[ÃÂâ]/.test(s)) return s;
  let out = s;
  for (const [re, rep] of MOJIBAKE_MAP) out = out.replace(re, rep);
  return out;
}
