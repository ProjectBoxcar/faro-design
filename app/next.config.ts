import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module; keep it external to the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  // Origins allowed to use the dev server (so you can open it from a phone/iPad
  // on the same Wi-Fi, e.g. http://192.168.1.x:3000). Adjust to your network.
  allowedDevOrigins: ["192.168.1.0/24"],
};

export default nextConfig;
