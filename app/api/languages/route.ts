import { NextResponse } from "next/server";
import { LANGUAGES, type LanguageOption } from "@/lib/language";

/**
 * Free language catalogue. LibreTranslate publishes its list without an API key,
 * so this route adds nothing to the deployment's dependencies.
 *
 * The bundled list stays authoritative for what a user may save: the endpoint is
 * cached for a day and only enriches the picker with codes the provider adds
 * later. If the upstream is unreachable the bundled list is returned, so the
 * dialog never depends on a third party being up.
 */
const SOURCE = "https://libretranslate.com/languages";
const REVALIDATE_SECONDS = 60 * 60 * 24;

type UpstreamLanguage = { code?: unknown; name?: unknown };

function isCode(value: unknown): value is string {
  return (
    typeof value === "string" && /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(value)
  );
}

/** Upstream names are English only; keep the bundled native name when we have one. */
function merge(upstream: UpstreamLanguage[]): LanguageOption[] {
  const known = new Map(LANGUAGES.map((language) => [language.code, language]));
  const merged: LanguageOption[] = [];

  for (const item of upstream) {
    if (!isCode(item.code)) continue;
    const bundled = known.get(item.code);
    if (bundled) {
      merged.push(bundled);
      known.delete(item.code);
      continue;
    }
    if (typeof item.name !== "string" || !item.name.trim()) continue;
    merged.push({
      code: item.code,
      name: item.name.trim(),
      nativeName: item.name.trim(),
    });
  }

  // Anything bundled but missing upstream stays available.
  merged.push(...known.values());
  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET() {
  try {
    const response = await fetch(SOURCE, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Upstream ${response.status}`);

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error("Unexpected payload");

    return NextResponse.json({
      data: merge(payload as UpstreamLanguage[]),
      source: "upstream",
    });
  } catch (error) {
    console.warn("Language catalogue fell back to the bundled list.", error);
    return NextResponse.json({ data: LANGUAGES, source: "bundled" });
  }
}
