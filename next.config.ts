import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  // Mail libraries use Node sockets/streams; load them from node_modules instead of bundling.
  serverExternalPackages: ["imapflow", "node-pop3", "mailparser", "nodemailer"],
};

export default nextConfig;
