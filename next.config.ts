import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the Z.ai preview panel (cross-origin iframe) to access dev resources.
  // This fixes the "Module factory is not available" HMR error that occurs
  // when the preview iframe tries to load /_next/* chunks from a different origin.
  allowedDevOrigins: ["*.space-z.ai", "localhost", "127.0.0.1"],
};

export default nextConfig;
