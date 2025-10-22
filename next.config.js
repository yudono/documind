/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // Proxy MinIO/S3 bucket paths through authenticated API to avoid AccessDenied
  async rewrites() {
    const bucket = process.env.S3_BUCKET_NAME || "document-assistant";
    return [
      // Mirror full bucket under `/${bucket}/...` via API proxy
      {
        source: `/${bucket}/:path*`,
        destination: `/api/proxy/${bucket}/:path*`,
      },
      // Convenience path for `/uploads/...` used by app
      {
        source: "/uploads/:path*",
        destination: `/api/proxy/${bucket}/uploads/:path*`,
      },
      // Explicit mapping for 'documind' bucket if used
      {
        source: "/documind/:path*",
        destination: "/api/proxy/documind/:path*",
      },
      {
        source: "/documind/uploads/:path*",
        destination: "/api/proxy/documind/uploads/:path*",
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Handle binary files (.node files) - use file-loader for server, ignore for client
    config.module.rules.push({
      test: /\.node$/,
      use: isServer ? "file-loader" : "ignore-loader",
    });

    // Handle Sharp binary files specifically
    config.module.rules.push({
      test: /sharp-.*\.node$/,
      use: "ignore-loader",
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
        "onnxruntime-node",
        "@xenova/transformers",
        "sharp",
        /^sharp\/.*/
      );
    }

    // Ignore test files and directories
    config.resolve.alias = {
      ...config.resolve.alias,
      "./test/data": false,
    };

    // Ignore Sharp and other native modules in client bundle
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        sharp: "commonjs sharp",
        "@xenova/transformers": "commonjs @xenova/transformers",
      });
    }

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: [
      "@xenova/transformers",
      "onnxruntime-node",
      "pdf-parse",
      "react-pdf-html",
      "@react-pdf/renderer",
      "html-to-docx",
      "2pptxgenjs",
      "html2pptxgenjs",
    ],
  },
};

module.exports = nextConfig;
