import type { Metadata } from "next";
import { RememberedView } from "@/components/remembered/remembered-view";

export const metadata: Metadata = {
  title: "Remembered — Billien",
  description: "Your saved words, translations, and review history.",
};

export default function RememberedPage() {
  return <RememberedView />;
}
