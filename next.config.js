/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true 
  },
  webpack: (config, { isServer }) => {
    // Handle binary files for onnxruntime-node
    config.module.rules.push({
      test: /\.node$/,
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
      };
      
      config.externals = config.externals || [];
      config.externals.push('onnxruntime-node', '@xenova/transformers');
    }

    // Ignore test files and directories
    config.resolve.alias = {
      ...config.resolve.alias,
      './test/data': false,
    };

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'pdf-parse']
  },
};

module.exports = nextConfig;