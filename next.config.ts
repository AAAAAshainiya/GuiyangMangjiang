import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  ...(process.env.MAHJONG_HOSTING === 'node' ? {
    distDir: '.next-node',
    serverExternalPackages: ['@libsql/client'],
    webpack(config, { webpack }) {
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(
        /^cloudflare:workers$/,
        (resource: { request: string }) => { resource.request = path.resolve('runtime/node-bindings.mjs'); },
      ));
      return config;
    },
  } : {}),
};

export default nextConfig;
