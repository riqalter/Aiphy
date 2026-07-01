import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const isProd = process.env.NODE_ENV === "production";
    const defaultApiUrl = isProd ? "http://api:4000" : "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL || defaultApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
