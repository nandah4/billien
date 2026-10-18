import type { Metadata } from "next";
import { DiscoveryView } from "@/components/discovery/discovery-view";

export const metadata: Metadata = {
  title: "Discovery — Billien",
  description: "Look up any English word and see its meaning.",
};

export default function DiscoveryPage() {
  return <DiscoveryView />;
}
