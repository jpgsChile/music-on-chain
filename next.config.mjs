/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // Silencia error Turbopack
  turbopack: {},

  transpilePackages: [
    '@moc/domain',
    '@moc/ports',
    '@moc/application',
    '@moc/adapters',
    '@moc/shared',
  ],

  experimental: {
    optimizePackageImports: ['wagmi', 'viem', '@tanstack/react-query'],
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'www.soundhelix.com' },
    ],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    const optionalDeps = [
      'porto/internal',
      'porto',
      '@base-org/account',
      '@coinbase/wallet-sdk',
      '@gemini-wallet/core',
      '@metamask/sdk',
      '@safe-global/safe-apps-sdk',
      '@safe-global/safe-apps-provider',
      '@walletconnect/ethereum-provider',
    ];

    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(optionalDeps.map(dep => [dep, false])),
    };

    return config;
  },
};

export default nextConfig;
