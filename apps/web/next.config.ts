import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    WEBSITE_BUILDER: process.env.WEBSITE_BUILDER,
  },
};

export default nextConfig;
