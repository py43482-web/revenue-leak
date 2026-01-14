/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_DEMO_MODE: process.env.DEMO_MODE || 'false',
  },
  // API route body size limits
  experimental: {
    serverActions: {
      bodySizeLimit: '100kb',
    },
  },
};

module.exports = nextConfig;
