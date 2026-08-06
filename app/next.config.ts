import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / binary packages — keep external to the server bundle.
  serverExternalPackages: ["better-sqlite3", "ffmpeg-static"],
  // Origins allowed to use the dev server for localhost, local Wi-Fi, and Tailscale
  // Tailscale typically uses 100.x.x.x addresses, local Wi-Fi varies by router
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.0.0/16",    // Common local network ranges
    "10.0.0.0/8",        // Common local network ranges
    "172.16.0.0/12",     // Common local network ranges
    "100.0.0.0/8",       // Tailscale and other VPN ranges
  ],
};

export default nextConfig;
