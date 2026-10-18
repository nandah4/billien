import type { Metadata } from "next";
import { AnalyticsView } from "@/components/analytics/analytics-view";

export const metadata: Metadata = {
  title: "Analytics — Billien",
  description: "Your daily and monthly activity and recall accuracy.",
};

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
