export const DEFAULT_LANGUAGE = "id";

export type LanguageOption = {
  code: string;
  name: string;
  nativeName: string;
};

/**
 * Languages the product exposes in the onboarding modal and profile.
 *
 * The codes are ISO 639-1 (plus the regional/script variants the translation
 * provider uses) because that is what the dictionary keys its `translations`
 * map by. The list is bundled rather than fetched at request time so the picker
 * renders instantly, works offline, and server-side validation is deterministic.
 * `GET /api/languages` may add codes the provider introduces later, but only for
 * display; a saved preference must exist here.
 */
export const LANGUAGES: LanguageOption[] = [
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "bg", name: "Bulgarian", nativeName: "Български" },
  { code: "ca", name: "Catalan", nativeName: "Català" },
  { code: "zh-Hans", name: "Chinese (Simplified)", nativeName: "简体中文" },
  { code: "zh-Hant", name: "Chinese (Traditional)", nativeName: "繁體中文" },
  { code: "cs", name: "Czech", nativeName: "Čeština" },
  { code: "da", name: "Danish", nativeName: "Dansk" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "eo", name: "Esperanto", nativeName: "Esperanto" },
  { code: "et", name: "Estonian", nativeName: "Eesti" },
  { code: "fi", name: "Finnish", nativeName: "Suomi" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "gl", name: "Galician", nativeName: "Galego" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά" },
  { code: "he", name: "Hebrew", nativeName: "עברית" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar" },
  { code: "ga", name: "Irish", nativeName: "Gaeilge" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ky", name: "Kyrgyz", nativeName: "Кыргызча" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu" },
  { code: "nb", name: "Norwegian", nativeName: "Norsk bokmål" },
  { code: "fa", name: "Persian", nativeName: "فارسی" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  {
    code: "pt-BR",
    name: "Portuguese (Brazil)",
    nativeName: "Português (Brasil)",
  },
  { code: "ro", name: "Romanian", nativeName: "Română" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "sr", name: "Serbian", nativeName: "Српски" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina" },
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "ur", name: "Urdu", nativeName: "اردو" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "sq", name: "Albanian", nativeName: "Shqip" },
  { code: "az", name: "Azerbaijani", nativeName: "Azərbaycan dili" },
  { code: "eu", name: "Basque", nativeName: "Euskara" },
];

const BY_CODE = new Map(LANGUAGES.map((language) => [language.code, language]));

export function isSupportedLanguage(value: unknown): value is string {
  return typeof value === "string" && BY_CODE.has(value);
}

/** Unknown or malformed values fall back to the default instead of throwing. */
export function normalizeLanguage(value: unknown): string {
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function languageName(code: string): string {
  return BY_CODE.get(code)?.name ?? "Unknown";
}

export function languageLabel(code: string): string {
  return BY_CODE.get(code)?.nativeName ?? code;
}

/**
 * Case- and accent-insensitive match over the code, the English name, and the
 * native name, so "espanol", "Español", and "es" all find Spanish.
 */
export function searchLanguages(query: string): LanguageOption[] {
  const needle = query
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!needle) return LANGUAGES;

  return LANGUAGES.filter((language) => {
    const haystack = `${language.code} ${language.name} ${language.nativeName}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return haystack.includes(needle);
  });
}
