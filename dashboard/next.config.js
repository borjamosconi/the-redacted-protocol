/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    // Fix pino-pretty missing dependency from WalletConnect
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
      encoding: false,
    }
    return config
  },
}

module.exports = nextConfig
