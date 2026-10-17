"use client";

import { AnimatePresence, motion } from "framer-motion";
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
    onSave?: () => void;
    onUnsave?: () => void;
    onSignIn?: () => void;
    onRetry?: () => void;
  };
  onClose: () => void;
};

function DetailBody({ detail, onClose }: DetailProps) {
  return (
    <WordDetail
      key={detail.word?.word ?? "empty"}
      word={detail.word}
      preferredLanguage={detail.preferredLanguage}
      isLoading={detail.isLoading}
      errorMessage={detail.errorMessage}
      isSaving={detail.isSaving}
      isUnsaving={detail.isUnsaving}
      onSave={detail.onSave}
      onUnsave={detail.onUnsave}
      onSignIn={detail.onSignIn}
      onRetry={detail.onRetry}
      onClose={onClose}
    />
  );
}

/**
 * Desktop: the right-hand workspace column, which collapses to zero width when
 * nothing is selected (see `.detail-split`).
 *
 * Mobile: the same content opens as a dialog over the list, so reading a word
 * never pushes the list out of view or forces a long scroll back.
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
        panelClassName="p-0"
      >
        <div className="max-h-[85dvh] overflow-y-auto overscroll-contain p-4">
          <DetailBody {...props} />
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
              <DetailBody {...props} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </aside>
  );
}
