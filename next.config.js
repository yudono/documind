/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true 
  },
  webpack: (config, { isServer }) => {
    // Handle binary files (.node files) - use file-loader for server, ignore for client
    config.module.rules.push({
      test: /\.node$/,
      use: isServer ? 'file-loader' : 'ignore-loader'
    });

    // Handle Sharp binary files specifically
    config.module.rules.push({
      test: /sharp-.*\.node$/,
      use: 'ignore-loader'
    });

    // Ignore onnxruntime-node and transformers on client side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        os: false,
        child_process: false,
      };
      
      config.externals = config.externals || [];
      config.externals.push(
        'onnxruntime-node', 
        '@xenova/transformers',
        'sharp',
        /^sharp\/.*/
      );
    }

    // Ignore test files and directories
    config.resolve.alias = {
      ...config.resolve.alias,
      './test/data': false,
    };

    // Ignore Sharp and other native modules in client bundle
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        'sharp': 'commonjs sharp',
        '@xenova/transformers': 'commonjs @xenova/transformers'
      });
    }

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'pdf-parse']
  },
};

module.exports = nextConfig;