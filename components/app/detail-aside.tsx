"use client";

import { AnimatePresence, motion } from "framer-motion";
import { DrillLauncher } from "@/components/drill/drill-launcher";
import { DrillPanel } from "@/components/drill/drill-panel";
import { WordDetail } from "@/components/words/word-detail";
import type { DictionaryResult, SavedWord } from "@/lib/types";
import { cardClass } from "@/lib/ui";

/**
 * The right-hand workspace. It collapses to zero width when nothing is
 * selected (see `.detail-split`), so the panel only mounts while it has
 * something to show.
 */
export function DetailAside({
  open,
  drillActive,
  detail,
  drill,
  launcher,
}: {
  open: boolean;
  drillActive: boolean;
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
  drill: {
    current: SavedWord | null;
    index: number;
    total: number;
    flipped: boolean;
    complete: boolean;
    loading: boolean;
    onFlip: () => void;
    onAnswer: (result: "remembered" | "forgotten") => void;
    onClose: () => void;
  };
  launcher: {
    visible: boolean;
    loading: boolean;
    count: number;
    onStart: () => void;
  };
}) {
  return (
    <aside className="min-w-0 overflow-hidden lg:min-h-0">
      <AnimatePresence initial={false}>
        {open ? (
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
              {drillActive ? (
                <DrillPanel
                  current={drill.current}
                  index={drill.index}
                  total={drill.total}
                  flipped={drill.flipped}
                  complete={drill.complete}
                  loading={drill.loading}
                  onFlip={drill.onFlip}
                  onAnswer={drill.onAnswer}
                  onClose={drill.onClose}
                />
              ) : (
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
                />
              )}
            </div>

            {launcher.visible ? (
              <DrillLauncher
                loading={launcher.loading}
                count={launcher.count}
                onStart={launcher.onStart}
              />
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </aside>
  );
}
