export const DEFAULT_LANGUAGE = "id";

export type LanguageOption = {
  code: string;
  name: string;
  nativeName: string;
  sample: string;
};

/**
 * Languages the product exposes in the onboarding modal and profile. The
 * dictionary stores every language it receives; this list only decides which
 * ones a user can pick as their translation target.
 */
export const LANGUAGES: LanguageOption[] = [
  {
    code: "id",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    sample: "halo",
  },
  { code: "en", name: "English", nativeName: "English", sample: "hello" },
  { code: "es", name: "Spanish", nativeName: "Español", sample: "hola" },
];

const SUPPORTED = new Set(LANGUAGES.map((language) => language.code));

export function isSupportedLanguage(value: unknown): value is string {
  return typeof value === "string" && SUPPORTED.has(value);
}

/** Unknown or malformed values fall back to the default instead of throwing. */
export function normalizeLanguage(value: unknown): string {
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function languageName(code: string): string {
  return (
    LANGUAGES.find((language) => language.code === code)?.name ?? "Unknown"
  );
}

export function languageLabel(code: string): string {
  return (
    LANGUAGES.find((language) => language.code === code)?.nativeName ?? code
  );
}
