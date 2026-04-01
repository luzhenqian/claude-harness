import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { resolve } from "path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@claude-harness/source"],
  // Include monorepo content directory in serverless function file tracing
  outputFileTracingRoot: resolve(__dirname, "../../"),
  // Include content MDX files in serverless bundle
  outputFileTracingIncludes: {
    "/[locale]/articles/[slug]": [
      "../../content/articles/**/*.mdx",
    ],
    "/[locale]/articles": ["../../content/articles/**/*.mdx"],
  },
  serverExternalPackages: ["shiki"],
};

export default withNextIntl(nextConfig);
