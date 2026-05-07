import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@radar-municipal/core", "@radar-municipal/scoring"],
  output: "standalone",
};

export default nextConfig;
