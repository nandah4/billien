import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to be reached from other devices on the local network
  // (e.g. http://192.168.110.246:3000). Next.js blocks cross-origin requests to
  // dev-only endpoints by default, which breaks the HMR websocket and disables
  // hot reload when the page is loaded from a non-localhost host.
  allowedDevOrigins: ["192.168.110.*"],
};

export default nextConfig;
