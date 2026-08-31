/** @type {import('next').NextConfig} */
const n8nWebhookBase =
  process.env.N8N_WEBHOOK_BASE || 'https://fixrrahul.app.n8n.cloud/webhook';

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  async rewrites() {
    return [
      {
        source: '/api/n8n/:path*',
        destination: `${n8nWebhookBase}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
