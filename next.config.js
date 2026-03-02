/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: false,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Ignore module resolution errors during development
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
  // Ensure server-only modules are properly handled
  experimental: {
    serverComponentsExternalPackages: ['jsonwebtoken', 'bcryptjs'],
  },
  // Note: For App Router, body size limits are handled in the route handlers.
  // The proxy route (/api/cloudinary-upload) streams files to Cloudinary,
  // so it can handle large files efficiently without hitting body size limits.
}

module.exports = nextConfig
