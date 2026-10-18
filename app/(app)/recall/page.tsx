import type { Metadata } from "next";
import { RecallView } from "@/components/recall/recall-view";

export const metadata: Metadata = {
  title: "Recall — Billien",
  description: "Practise the English words you have already saved.",
};

export default function RecallPage() {
  return <RecallView />;
}
