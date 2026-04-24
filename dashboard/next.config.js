const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config) => {
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
