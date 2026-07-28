// Las 20 categorías de BailaNow TV — géneros de baile latino más famosos.
// Se usan en el filtro del home de TV y en el formulario del creador.
export const TV_GENRES: { slug: string; label: string; emoji: string }[] = [
  { slug: 'salsa',           label: 'Salsa',            emoji: '🕺' },
  { slug: 'salsa-cubana',    label: 'Salsa cubana',     emoji: '🇨🇺' },
  { slug: 'salsa-linea',     label: 'Salsa en línea',   emoji: '💫' },
  { slug: 'rueda-casino',    label: 'Rueda de casino',  emoji: '🔄' },
  { slug: 'bachata',         label: 'Bachata',          emoji: '❤️' },
  { slug: 'bachata-sensual', label: 'Bachata sensual',  emoji: '🌹' },
  { slug: 'bachata-dominicana', label: 'Bachata dominicana', emoji: '🇩🇴' },
  { slug: 'kizomba',         label: 'Kizomba',          emoji: '🌍' },
  { slug: 'zouk',            label: 'Zouk',             emoji: '🌊' },
  { slug: 'merengue',        label: 'Merengue',         emoji: '🥁' },
  { slug: 'cha-cha-cha',     label: 'Cha-cha-chá',      emoji: '✨' },
  { slug: 'son-cubano',      label: 'Son cubano',       emoji: '🎺' },
  { slug: 'rumba',           label: 'Rumba (Guaguancó)', emoji: '🪘' },
  { slug: 'timba',           label: 'Timba',            emoji: '🔥' },
  { slug: 'reparto',         label: 'Reparto cubano',   emoji: '🎧' },
  { slug: 'reggaeton',       label: 'Reggaetón',        emoji: '💥' },
  { slug: 'mambo',           label: 'Mambo',            emoji: '🎷' },
  { slug: 'cumbia',          label: 'Cumbia',           emoji: '🪗' },
  { slug: 'afro',            label: 'Afro / Orishas',   emoji: '🌀' },
  { slug: 'dembow',          label: 'Dembow',           emoji: '⚡' },
];

export const genreLabel = (slug: string) => TV_GENRES.find(g => g.slug === slug)?.label || slug;
