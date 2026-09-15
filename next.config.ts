import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Helps Turbopack resolve PostCSS/Tailwind from this app's node_modules.
  turbopack: {
    root: projectRoot,
  },
  serverExternalPackages: ["@tailwindcss/postcss", "tailwindcss", "lightningcss"],
};

export default nextConfig;
