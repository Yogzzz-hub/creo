import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
<<<<<<< HEAD
    root: path.resolve(__dirname, "../../"),
=======
    root: process.cwd(),
>>>>>>> origin/dev
  },
};

export default nextConfig;