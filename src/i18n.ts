export const LANGS = ["fr", "en", "ru", "zh", "hi"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABELS: Record<Lang, string> = {
  fr: "Français",
  en: "English",
  ru: "Русский",
  zh: "中文",
  hi: "हिन्दी",
};

export const LOCALE_TAGS: Record<Lang, string> = {
  fr: "fr-FR",
  en: "en-US",
  ru: "ru-RU",
  zh: "zh-CN",
  hi: "hi-IN",
};

type Dict = {
  appTitle: string;
  tagline: string;
  loading: string;
  errorMsg: string;
  emptyMsg: string;
  sourceLabel: string;
  readArticle: string;
  translateLink: string;
  languageLabel: string;
  refreshLabel: string;
  footerNote: string;
};

export const DICTIONARY: Record<Lang, Dict> = {
  fr: {
    appTitle: "Bonnes Nouvelles",
    tagline: "Les vraies bonnes nouvelles du monde, chaque jour.",
    loading: "Chargement des bonnes nouvelles…",
    errorMsg: "Impossible de charger les actualités pour le moment.",
    emptyMsg: "Aucune nouvelle pour l'instant, revenez un peu plus tard.",
    sourceLabel: "Source",
    readArticle: "Lire l'article original",
    translateLink: "Traduire",
    languageLabel: "Langue",
    refreshLabel: "Actualiser",
    footerNote:
      "Sélection de vrais articles publiés par des médias spécialisés en actualités positives et journalisme de solutions. Les articles restent dans leur langue d'origine — utilisez le lien « Traduire » pour une traduction automatique.",
  },
  en: {
    appTitle: "Good News",
    tagline: "Real good news from around the world, every day.",
    loading: "Loading today's good news…",
    errorMsg: "Couldn't load the news right now.",
    emptyMsg: "No stories yet — check back a little later.",
    sourceLabel: "Source",
    readArticle: "Read the original article",
    translateLink: "Translate",
    languageLabel: "Language",
    refreshLabel: "Refresh",
    footerNote:
      "A curated selection of real articles from newsrooms dedicated to positive, solutions-focused journalism. Articles stay in their original language — use the \"Translate\" link for machine translation.",
  },
  ru: {
    appTitle: "Хорошие новости",
    tagline: "Настоящие хорошие новости со всего мира, каждый день.",
    loading: "Загрузка хороших новостей…",
    errorMsg: "Не удалось загрузить новости.",
    emptyMsg: "Пока нет новостей — загляните немного позже.",
    sourceLabel: "Источник",
    readArticle: "Читать оригинал статьи",
    translateLink: "Перевести",
    languageLabel: "Язык",
    refreshLabel: "Обновить",
    footerNote:
      "Подборка настоящих статей от изданий, специализирующихся на позитивной журналистике решений. Статьи остаются на языке оригинала — используйте ссылку «Перевести» для машинного перевода.",
  },
  zh: {
    appTitle: "好消息",
    tagline: "每天播报来自世界各地的真实好消息。",
    loading: "正在加载今日好消息…",
    errorMsg: "暂时无法加载新闻。",
    emptyMsg: "暂时还没有新消息，请稍后再来看看。",
    sourceLabel: "来源",
    readArticle: "阅读原文",
    translateLink: "翻译",
    languageLabel: "语言",
    refreshLabel: "刷新",
    footerNote:
      "精选自专注于积极正能量与解决方案新闻报道的媒体的真实文章。文章保留原文语言——可点击“翻译”链接获取机器翻译。",
  },
  hi: {
    appTitle: "अच्छी खबरें",
    tagline: "दुनिया भर की सच्ची अच्छी खबरें, हर दिन।",
    loading: "आज की अच्छी खबरें लोड हो रही हैं…",
    errorMsg: "अभी खबरें लोड नहीं हो पाईं।",
    emptyMsg: "अभी तक कोई खबर नहीं है, थोड़ी देर बाद देखें।",
    sourceLabel: "स्रोत",
    readArticle: "मूल लेख पढ़ें",
    translateLink: "अनुवाद करें",
    languageLabel: "भाषा",
    refreshLabel: "रीफ्रेश करें",
    footerNote:
      "सकारात्मक और समाधान-केंद्रित पत्रकारिता में विशेषज्ञ समाचार माध्यमों के असली लेखों का चयन। लेख अपनी मूल भाषा में ही रहते हैं — मशीनी अनुवाद के लिए 'अनुवाद करें' लिंक का उपयोग करें।",
  },
};
