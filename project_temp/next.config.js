const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Updated for Next.js 16: moved from experimental
  serverExternalPackages: ['mongodb'],
  // Turbopack config for Next.js 16
  turbopack: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
