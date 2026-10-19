"use client";

import { ArrowRight } from "lucide-react";
import type { LibraryWord } from "@/lib/library";

/**
 * The last few words the user saved, shown under the Discovery result so the
 * page is not empty before a search starts. Rows are compact: this is a
 * shortcut back to a word, not a second library.
 */
export function NewestRemembered({
  items,
  onSelect,
}: {
  items: LibraryWord[];
  onSelect: (item: LibraryWord) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-4">
      <h2 className="px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
        Newest remembered
      </h2>

      <ul className="mt-2 grid list-none gap-1.5 p-0">
        {items.map((item) => {
          const meaning = item.translation.slice(0, 2).join(" · ");
          return (
            <li key={item.key}>
              <button
                className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-left transition hover:border-accent-line hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                type="button"
                onClick={() => onSelect(item)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">
                    {item.word}
                  </span>
                  {meaning ? (
                    <span className="mt-0.5 block truncate text-[11px] text-muted">
                      {meaning}
                    </span>
                  ) : null}
                </span>
                <ArrowRight
                  size={14}
                  className="shrink-0 text-faint"
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
