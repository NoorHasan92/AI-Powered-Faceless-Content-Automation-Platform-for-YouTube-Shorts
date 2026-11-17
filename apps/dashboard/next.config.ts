import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.0.100"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ["fluent-ffmpeg", "ffmpeg-static", "@prisma/client", "pg"],
};

export default nextConfig;
