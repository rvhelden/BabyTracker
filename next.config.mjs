/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['*.devtunnels.ms'],
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
