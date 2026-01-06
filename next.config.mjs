/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones para reducir consumo de recursos
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Reducir compilación en desarrollo
  experimental: {
    optimizePackageImports: ['wagmi', 'viem', '@tanstack/react-query'],
  },
  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "www.soundhelix.com",
      },
    ],
  },
  webpack: (config, { isServer, dev }) => {
    // Optimizaciones de webpack para desarrollo
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.next'],
      };
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    // Ignore optional dependencies that cause build issues
    const optionalDeps = [
      "porto/internal",
      "porto",
      "@base-org/account",
      "@coinbase/wallet-sdk",
      "@gemini-wallet/core",
      "@metamask/sdk",
      "@safe-global/safe-apps-sdk",
      "@safe-global/safe-apps-provider",
      "@walletconnect/ethereum-provider",
    ];
    
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(optionalDeps.map(dep => [dep, false])),
    };
    return config;
  },
};

export default nextConfig;
