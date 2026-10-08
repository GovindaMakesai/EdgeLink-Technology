/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    cpus: 1,
    serverComponentsExternalPackages: [
      '@prisma/client',
      'bullmq',
      'ioredis',
      'puppeteer',
      'cheerio',
    ],
  },
};

module.exports = nextConfig;
