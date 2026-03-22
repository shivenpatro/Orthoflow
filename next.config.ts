import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Custom webpack config for Web Worker support
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.output.globalObject = "self";
    }
    return config;
  },
  // NOTE: We intentionally do NOT add COEP/COOP headers here.
  // Those would break MediaPipe's CDN model fetching from storage.googleapis.com
  // and Google's CDN from cdn.jsdelivr.net inside the Web Worker.
  // SharedArrayBuffer is not needed for this use case.
};

export default nextConfig;
