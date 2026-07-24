import type { NextConfig } from "next";
import path from "node:path";

const ibmRuntime = process.env.WATSON_CDI_RUNTIME === "ibm";

const nextConfig: NextConfig = {
  // The IBM Cloud image runs the self-contained Node server emitted here.
  // Vinext/Sites keeps using vite.config.ts and ignores this packaging option.
  output: "standalone",
  poweredByHeader: false,
  webpack(config, { webpack }) {
    if (ibmRuntime) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^cloudflare:workers$/,
          path.resolve("lib/platform/cloudflare-workers-stub.ts"),
        ),
      );
    }
    return config;
  },
};

export default nextConfig;
