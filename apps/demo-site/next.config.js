/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@aura-sign/client', '@aura-sign/next-auth', '@aura-sign/react'],
};

module.exports = nextConfig;
