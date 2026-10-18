import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Billien — Learn English, one word at a time",
  description:
    "A personal English vocabulary app for word discovery and review.",
};

// `viewportFit: cover` lets the bottom navigation pad itself against the iOS
// home indicator via env(safe-area-inset-bottom).
export const viewport: Viewport = {
  themeColor: "#f4f5f7",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh bg-canvas text-ink">
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
