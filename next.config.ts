import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix Turbopack root resolution - there's a package-lock.json in /Users/alex
  // that confuses Turbopack into using the wrong workspace root
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
