"use client";

import { AnimatePresence, motion } from "framer-motion";
import { DrillLauncher } from "@/components/drill/drill-launcher";
import { DrillPanel } from "@/components/drill/drill-panel";
import { Modal } from "@/components/ui/modal";
import { WordDetail } from "@/components/words/word-detail";
import { useIsDesktop } from "@/hooks/use-media-query";
import type { DictionaryResult, SavedWord } from "@/lib/types";
import { cardClass } from "@/lib/ui";

type DetailProps = {
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
  onClose: () => void;
};

function DetailBody({ drillActive, detail, drill, onClose }: DetailProps) {
  if (drillActive) {
    return (
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
    );
  }

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

function Launcher({ launcher }: { launcher: DetailProps["launcher"] }) {
  if (!launcher.visible) return null;
  return (
    <DrillLauncher
      loading={launcher.loading}
      count={launcher.count}
      onStart={launcher.onStart}
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
          {props.launcher.visible ? (
            <div className="mt-4">
              <Launcher launcher={props.launcher} />
            </div>
          ) : null}
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
            <Launcher launcher={props.launcher} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </aside>
  );
}
