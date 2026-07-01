/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'automacaothiagosantos.com.br',
      },
    ],
  },
}

module.exports = nextConfig
