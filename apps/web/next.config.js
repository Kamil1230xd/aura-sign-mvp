/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@aura-sign/client', '@aura-sign/database-client'],
};

module.exports = nextConfig;
