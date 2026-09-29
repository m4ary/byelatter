import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  // Mail libraries use Node sockets/streams; load them from node_modules instead of bundling.
  serverExternalPackages: ["imapflow", "node-pop3", "mailparser", "nodemailer"],
  // package.json is the single source of truth for the app version.
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default nextConfig;
