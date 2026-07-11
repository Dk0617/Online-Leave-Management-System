import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root to this folder — otherwise Turbopack sees the
    // sibling backend/package-lock.json and infers the repo root one level
    // up, where there's no node_modules, breaking module resolution.
    root: path.join(__dirname),
  },
};

export default nextConfig;
