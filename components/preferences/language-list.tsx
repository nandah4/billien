"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { LANGUAGES, searchLanguages } from "@/lib/language";
import { useQuery } from "@tanstack/react-query";
import { languagesQueryOptions } from "@/lib/api";

/**
 * Searchable language list shared by the onboarding dialog and the profile
 * picker.
 *
 * The catalogue renders from the bundled list immediately and upgrades if
 * `/api/languages` returns more, so the dialog never waits on the network. A
 * filter is required here: the catalogue has around fifty entries, and a flat
 * list of that length is unusable in a dialog.
 */
export function LanguageList({
  current,
  saving,
  onSelect,
  variant = "compact",
}: {
  current: string;
  /** Code currently being saved, if any. */
  saving: string | null;
  onSelect: (code: string) => void;
  /** `compact` for the profile picker, `card` for onboarding. */
  variant?: "compact" | "card";
}) {
  const [query, setQuery] = useState("");
  const languages = useQuery(languagesQueryOptions());
  const options = languages.data ?? LANGUAGES;

  // Filter the fetched list, not the bundled one, so upstream additions are
  // searchable too. `searchLanguages` is the bundled-only fallback path.
  const visible = useMemo(() => {
    if (!query.trim()) return options;
    const needle = query
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const matches = options.filter((language) =>
      `${language.code} ${language.name} ${language.nativeName}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(needle),
    );
    return matches.length > 0 ? matches : searchLanguages(query);
  }, [options, query]);

  const busy = saving !== null;

  return (
    <div>
      <label className="flex items-center gap-2 rounded-lg border border-line bg-subtle px-3 py-2 focus-within:border-accent focus-within:bg-surface">
        <Search size={15} className="shrink-0 text-faint" aria-hidden="true" />
        <input
          className="w-full min-w-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-placeholder sm:text-[13px]"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a language…"
          aria-label="Search languages"
        />
      </label>

      <div
        className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-line"
        role="radiogroup"
        aria-label="Translation language"
      >
        {visible.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12px] text-muted">
            No language matches “{query.trim()}”.
          </p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {visible.map((language) => {
              const active = current === language.code;
              const pending = saving === language.code;
              return (
                <li key={language.code}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-hover focus-within:outline-2 focus-within:outline-offset-[-2px] focus-within:outline-focus ${
                      pending ? "opacity-60" : ""
                    } ${busy ? "cursor-not-allowed" : ""} ${
                      variant === "card" && active ? "bg-accent-soft" : ""
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="picker-language"
                      value={language.code}
                      checked={active}
                      disabled={busy}
                      onChange={() => onSelect(language.code)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">
                        {language.nativeName}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted">
                        {language.name}
                      </span>
                    </span>
                    {active ? (
                      <Check
                        size={16}
                        className="shrink-0 text-accent"
                        aria-hidden="true"
                      />
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
