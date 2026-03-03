/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  experimental: {
    serverActions: {
      allowedOrigins: [
        'zh8lf0hc-3000.euw.devtunnels.ms',
        'localhost:3000',
        '*.devtunnels.ms',
      ],
    },
  },
};

export default nextConfig;
