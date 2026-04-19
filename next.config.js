/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },   // S3 presigned URLs
      { protocol: 'https', hostname: 'vumbnail.com' },       // Vimeo thumbnails
      { protocol: 'https', hostname: 'i.vimeocdn.com' },
    ],
  },
  // Tenant routing: /t/[slug] or support subdomains in middleware
  async rewrites() {
    return [
      {
        source: '/t/:tenant/:path*',
        destination: '/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
