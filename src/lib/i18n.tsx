/**
 * i18n — sistema de internacionalización ligero (sin dependencias)
 *
 * Soporta los idiomas más hablados del mundo. Detecta el idioma del navegador,
 * permite cambio manual, persiste en localStorage.
 *
 * Uso:
 *   const { t, lang, setLang } = useI18n();
 *   <h1>{t('home.title')}</h1>
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type LangCode = 'es' | 'en' | 'pt' | 'fr' | 'zh' | 'ar' | 'hi' | 'ru' | 'de' | 'it' | 'ja' | 'ko';

export const LANGUAGES: { code: LangCode; name: string; flag: string; rtl?: boolean }[] = [
  { code: 'es', name: 'Español',    flag: '🇪🇸' },
  { code: 'en', name: 'English',    flag: '🇬🇧' },
  { code: 'pt', name: 'Português',  flag: '🇧🇷' },
  { code: 'fr', name: 'Français',   flag: '🇫🇷' },
  { code: 'it', name: 'Italiano',   flag: '🇮🇹' },
  { code: 'de', name: 'Deutsch',    flag: '🇩🇪' },
  { code: 'zh', name: '中文',        flag: '🇨🇳' },
  { code: 'ja', name: '日本語',       flag: '🇯🇵' },
  { code: 'ko', name: '한국어',       flag: '🇰🇷' },
  { code: 'hi', name: 'हिन्दी',       flag: '🇮🇳' },
  { code: 'ar', name: 'العربية',     flag: '🇸🇦', rtl: true },
  { code: 'ru', name: 'Русский',    flag: '🇷🇺' },
];

// ── Diccionario de traducciones ────────────────────────────────
type Dict = Record<string, string>;
const STRINGS: Record<LangCode, Dict> = {
  es: {
    'nav.home': 'Inicio', 'nav.near': 'Cerca', 'nav.events': 'Eventos', 'nav.danceflow': 'Baila con IA',
    'df.title': 'Baila con Avatares IA', 'df.subtitle': 'Aprende con coreógrafos virtuales y compite en el ranking mundial',
    'df.choose': 'Elige tu coreógrafo', 'df.solo': 'Solo', 'df.pair': 'Pareja', 'df.all': 'Todos',
    'df.start': 'Empezar a bailar', 'df.ranking': 'Ranking Mundial', 'df.countryRanking': 'Ranking por Países',
    'df.yourRank': 'Tu posición', 'df.points': 'puntos', 'df.level': 'Nivel', 'df.players': 'jugadores',
    'df.world': 'Mundial', 'df.you': 'TÚ', 'df.topDancers': 'Mejores Bailarines del Mundo',
    'df.loginToCompete': 'Inicia sesión para competir', 'df.specialty': 'Especialidad',
    'df.sessions': 'sesiones', 'df.viewAll': 'Ver todo', 'df.live': 'EN VIVO',
    'rank.title': '🏆 Ranking Mundial de Baile', 'rank.seeAll': 'Ver ranking completo',
  },
  en: {
    'nav.home': 'Home', 'nav.near': 'Near me', 'nav.events': 'Events', 'nav.danceflow': 'Dance with AI',
    'df.title': 'Dance with AI Avatars', 'df.subtitle': 'Learn with virtual choreographers and compete in the world ranking',
    'df.choose': 'Choose your choreographer', 'df.solo': 'Solo', 'df.pair': 'Duo', 'df.all': 'All',
    'df.start': 'Start dancing', 'df.ranking': 'World Ranking', 'df.countryRanking': 'Country Ranking',
    'df.yourRank': 'Your rank', 'df.points': 'points', 'df.level': 'Level', 'df.players': 'players',
    'df.world': 'World', 'df.you': 'YOU', 'df.topDancers': 'Top Dancers Worldwide',
    'df.loginToCompete': 'Log in to compete', 'df.specialty': 'Specialty',
    'df.sessions': 'sessions', 'df.viewAll': 'View all', 'df.live': 'LIVE',
    'rank.title': '🏆 World Dance Ranking', 'rank.seeAll': 'See full ranking',
  },
  pt: {
    'nav.home': 'Início', 'nav.near': 'Perto', 'nav.events': 'Eventos', 'nav.danceflow': 'Dance com IA',
    'df.title': 'Dance com Avatares IA', 'df.subtitle': 'Aprenda com coreógrafos virtuais e compita no ranking mundial',
    'df.choose': 'Escolha seu coreógrafo', 'df.solo': 'Solo', 'df.pair': 'Dupla', 'df.all': 'Todos',
    'df.start': 'Começar a dançar', 'df.ranking': 'Ranking Mundial', 'df.countryRanking': 'Ranking por País',
    'df.yourRank': 'Sua posição', 'df.points': 'pontos', 'df.level': 'Nível', 'df.players': 'jogadores',
    'df.world': 'Mundial', 'df.you': 'VOCÊ', 'df.topDancers': 'Melhores Dançarinos do Mundo',
    'df.loginToCompete': 'Entre para competir', 'df.specialty': 'Especialidade',
    'df.sessions': 'sessões', 'df.viewAll': 'Ver tudo', 'df.live': 'AO VIVO',
    'rank.title': '🏆 Ranking Mundial de Dança', 'rank.seeAll': 'Ver ranking completo',
  },
  fr: {
    'nav.home': 'Accueil', 'nav.near': 'Près', 'nav.events': 'Événements', 'nav.danceflow': 'Danse avec IA',
    'df.title': 'Danse avec des Avatars IA', 'df.subtitle': 'Apprenez avec des chorégraphes virtuels et participez au classement mondial',
    'df.choose': 'Choisissez votre chorégraphe', 'df.solo': 'Solo', 'df.pair': 'Duo', 'df.all': 'Tous',
    'df.start': 'Commencer à danser', 'df.ranking': 'Classement Mondial', 'df.countryRanking': 'Classement par Pays',
    'df.yourRank': 'Votre rang', 'df.points': 'points', 'df.level': 'Niveau', 'df.players': 'joueurs',
    'df.world': 'Monde', 'df.you': 'VOUS', 'df.topDancers': 'Meilleurs Danseurs du Monde',
    'df.loginToCompete': 'Connectez-vous pour participer', 'df.specialty': 'Spécialité',
    'df.sessions': 'sessions', 'df.viewAll': 'Voir tout', 'df.live': 'EN DIRECT',
    'rank.title': '🏆 Classement Mondial de Danse', 'rank.seeAll': 'Voir le classement complet',
  },
  zh: {
    'nav.home': '首页', 'nav.near': '附近', 'nav.events': '活动', 'nav.danceflow': 'AI共舞',
    'df.title': '与AI虚拟舞者共舞', 'df.subtitle': '跟随虚拟编舞学习，参与世界排名',
    'df.choose': '选择你的编舞', 'df.solo': '单人', 'df.pair': '双人', 'df.all': '全部',
    'df.start': '开始跳舞', 'df.ranking': '世界排名', 'df.countryRanking': '国家排名',
    'df.yourRank': '你的排名', 'df.points': '积分', 'df.level': '等级', 'df.players': '玩家',
    'df.world': '世界', 'df.you': '你', 'df.topDancers': '世界顶尖舞者',
    'df.loginToCompete': '登录参与竞赛', 'df.specialty': '专长',
    'df.sessions': '场次', 'df.viewAll': '查看全部', 'df.live': '直播',
    'rank.title': '🏆 世界舞蹈排名', 'rank.seeAll': '查看完整排名',
  },
  hi: {
    'nav.home': 'होम', 'nav.near': 'पास', 'nav.events': 'इवेंट्स', 'nav.danceflow': 'AI के साथ नृत्य',
    'df.title': 'AI अवतार के साथ नृत्य करें', 'df.subtitle': 'वर्चुअल कोरियोग्राफर से सीखें और विश्व रैंकिंग में प्रतिस्पर्धा करें',
    'df.choose': 'अपना कोरियोग्राफर चुनें', 'df.solo': 'एकल', 'df.pair': 'जोड़ी', 'df.all': 'सभी',
    'df.start': 'नृत्य शुरू करें', 'df.ranking': 'विश्व रैंकिंग', 'df.countryRanking': 'देश रैंकिंग',
    'df.yourRank': 'आपकी रैंक', 'df.points': 'अंक', 'df.level': 'स्तर', 'df.players': 'खिलाड़ी',
    'df.world': 'विश्व', 'df.you': 'आप', 'df.topDancers': 'विश्व के शीर्ष नर्तक',
    'df.loginToCompete': 'प्रतिस्पर्धा के लिए लॉगिन करें', 'df.specialty': 'विशेषज्ञता',
    'df.sessions': 'सत्र', 'df.viewAll': 'सभी देखें', 'df.live': 'लाइव',
    'rank.title': '🏆 विश्व नृत्य रैंकिंग', 'rank.seeAll': 'पूर्ण रैंकिंग देखें',
  },
  ar: {
    'nav.home': 'الرئيسية', 'nav.near': 'قريب', 'nav.events': 'فعاليات', 'nav.danceflow': 'ارقص مع الذكاء',
    'df.title': 'ارقص مع أفاتار الذكاء الاصطناعي', 'df.subtitle': 'تعلّم مع مصممي رقصات افتراضيين ونافس في التصنيف العالمي',
    'df.choose': 'اختر مصمم الرقص', 'df.solo': 'فردي', 'df.pair': 'ثنائي', 'df.all': 'الكل',
    'df.start': 'ابدأ الرقص', 'df.ranking': 'التصنيف العالمي', 'df.countryRanking': 'تصنيف الدول',
    'df.yourRank': 'ترتيبك', 'df.points': 'نقاط', 'df.level': 'المستوى', 'df.players': 'لاعبين',
    'df.world': 'العالم', 'df.you': 'أنت', 'df.topDancers': 'أفضل الراقصين في العالم',
    'df.loginToCompete': 'سجّل الدخول للمنافسة', 'df.specialty': 'التخصص',
    'df.sessions': 'جلسات', 'df.viewAll': 'عرض الكل', 'df.live': 'مباشر',
    'rank.title': '🏆 التصنيف العالمي للرقص', 'rank.seeAll': 'عرض التصنيف الكامل',
  },
  ru: {
    'nav.home': 'Главная', 'nav.near': 'Рядом', 'nav.events': 'События', 'nav.danceflow': 'Танец с ИИ',
    'df.title': 'Танцуй с ИИ-аватарами', 'df.subtitle': 'Учись с виртуальными хореографами и соревнуйся в мировом рейтинге',
    'df.choose': 'Выбери хореографа', 'df.solo': 'Соло', 'df.pair': 'Пара', 'df.all': 'Все',
    'df.start': 'Начать танцевать', 'df.ranking': 'Мировой рейтинг', 'df.countryRanking': 'Рейтинг стран',
    'df.yourRank': 'Ваш ранг', 'df.points': 'очков', 'df.level': 'Уровень', 'df.players': 'игроков',
    'df.world': 'Мир', 'df.you': 'ВЫ', 'df.topDancers': 'Лучшие танцоры мира',
    'df.loginToCompete': 'Войдите, чтобы соревноваться', 'df.specialty': 'Специализация',
    'df.sessions': 'сессий', 'df.viewAll': 'Смотреть все', 'df.live': 'ПРЯМОЙ ЭФИР',
    'rank.title': '🏆 Мировой рейтинг танцев', 'rank.seeAll': 'Полный рейтинг',
  },
  it: { 'nav.home': 'Home', 'nav.near': 'Vicino', 'nav.events': 'Eventi', 'nav.danceflow': 'Balla con IA' },
  de: { 'nav.home': 'Start', 'nav.near': 'In der Nähe', 'nav.events': 'Events', 'nav.danceflow': 'Tanz mit KI' },
  ja: { 'nav.home': 'ホーム', 'nav.near': '近く', 'nav.events': 'イベント', 'nav.danceflow': 'AIとダンス' },
  ko: { 'nav.home': '홈', 'nav.near': '내 주변', 'nav.events': '이벤트', 'nav.danceflow': 'AI와 춤' },
};

const STORAGE_KEY = 'bn-lang';

function detectLang(): LangCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as LangCode;
    if (saved && STRINGS[saved]) return saved;
  } catch { /* noop */ }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'es').slice(0, 2) as LangCode;
  return STRINGS[nav] ? nav : 'es';
}

interface I18nContextValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string) => string;
  rtl: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'es', setLang: () => {}, t: (k) => k, rtl: false,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LangCode>('es');

  useEffect(() => { setLangState(detectLang()); }, []);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* noop */ }
    const rtl = LANGUAGES.find(x => x.code === l)?.rtl ?? false;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  }, []);

  useEffect(() => {
    const rtl = LANGUAGES.find(x => x.code === lang)?.rtl ?? false;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key: string) => {
    return STRINGS[lang]?.[key] ?? STRINGS.es[key] ?? key;
  }, [lang]);

  const rtl = LANGUAGES.find(x => x.code === lang)?.rtl ?? false;

  return (
    <I18nContext.Provider value={{ lang, setLang, t, rtl }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  return useContext(I18nContext);
}
