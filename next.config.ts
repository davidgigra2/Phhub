import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "192.168.1.9:3000"],
    },
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/admin/votes/create',
        destination: '/dashboard',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
