import { cardClass } from "@/lib/ui";

export function AppFooter() {
  return (
    <footer
      className={`${cardClass} flex shrink-0 flex-col gap-2 px-4 py-3 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between`}
    >
      <p className="m-0">
        <span className="font-semibold text-ink">Billien</span> · Lexical
        Mastery Platform
      </p>
      <p className="m-0">
        © 2025 Billien. Focused cognitive language acquisition and lexical
        tracking.
      </p>
      <p className="m-0">
        Definitions by{" "}
        <a
          className="font-medium text-accent underline decoration-accent-line hover:decoration-accent"
          href="https://freedictionaryapi.com"
          target="_blank"
          rel="noreferrer"
        >
          Free Dictionary API
        </a>
      </p>
    </footer>
  );
}
