import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost', '10.92.189.67'],
};

export default nextConfig;