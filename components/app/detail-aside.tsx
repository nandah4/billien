"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpenText, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { WordDetail } from "@/components/words/word-detail";
import { useIsDesktop } from "@/hooks/use-media-query";
import type { DictionaryResult, SavedWord } from "@/lib/types";
import { cardClass } from "@/lib/ui";

type DetailProps = {
  open: boolean;
  detail: {
    word: SavedWord | DictionaryResult | null;
    preferredLanguage: string;
    isLoading: boolean;
    errorMessage: string | null;
    isSaving: boolean;
    isUnsaving: boolean;
    isReviewing: boolean;
    onSave?: () => void;
    onUnsave?: () => void;
    onReview?: () => void;
    onSignIn?: () => void;
    onRetry?: () => void;
  };
  onClose: () => void;
};

function DetailBody({
  detail,
  onClose,
  showHeader,
}: DetailProps & { showHeader: boolean }) {
  return (
    <WordDetail
      key={detail.word?.word ?? "empty"}
      word={detail.word}
      preferredLanguage={detail.preferredLanguage}
      isLoading={detail.isLoading}
      errorMessage={detail.errorMessage}
      isSaving={detail.isSaving}
      isUnsaving={detail.isUnsaving}
      isReviewing={detail.isReviewing}
      onSave={detail.onSave}
      onUnsave={detail.onUnsave}
      onReview={detail.onReview}
      onSignIn={detail.onSignIn}
      onRetry={detail.onRetry}
      onClose={onClose}
      showHeader={showHeader}
    />
  );
}

/**
 * Mobile sheet header. It lives outside the scroll container so the close
 * control stays reachable no matter how far the word detail is scrolled.
 */
function SheetHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
      <span className="flex items-center gap-2 text-[12px] font-semibold text-ink">
        <BookOpenText size={15} className="text-accent" aria-hidden="true" />
        Detail Words
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          className="-mr-1 inline-flex size-9 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          type="button"
          onClick={onClose}
          aria-label="Close detail"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Desktop: the right-hand workspace column, which collapses to zero width when
 * nothing is selected (see `.detail-split`).
 *
 * Mobile: the same content opens as a dialog over the list. The dialog is
 * offset from the fixed bottom navigation so the two surfaces never touch.
 */
export function DetailAside(props: DetailProps) {
  const isDesktop = useIsDesktop();

  if (!isDesktop) {
    return (
      <Modal
        open={props.open}
        onClose={props.onClose}
        label="Detail Words"
        maxWidthClass="max-w-lg"
        panelClassName="flex max-h-full flex-col overflow-hidden p-0"
        // Leave room for the fixed bottom navigation plus a visible gap.
        overlayClassName="p-4 pb-[calc(5rem_+_env(safe-area-inset-bottom))]"
      >
        <SheetHeader onClose={props.onClose} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <DetailBody {...props} showHeader={false} />
        </div>
      </Modal>
    );
  }

  return (
    <aside className="min-w-0 overflow-hidden lg:min-h-0">
      <AnimatePresence initial={false}>
        {props.open ? (
          <motion.div
            key="detail-panel"
            className="flex flex-col gap-4 lg:h-full lg:min-h-0"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
            transition={{ duration: 0.26, ease: "easeOut" }}
          >
            <div
              className={`${cardClass} p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto`}
            >
              <DetailBody {...props} showHeader />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </aside>
  );
}
