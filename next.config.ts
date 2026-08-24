import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The quiz and MCP search now live on retriever.run; permanent
    // redirects transfer the pages' backlinks and rankings there.
    return [
      {
        source: "/quiz",
        destination: "https://retriever.run/learn-claude",
        permanent: true,
      },
      {
        source: "/quiz/:path*",
        destination: "https://retriever.run/learn-claude",
        permanent: true,
      },
      {
        source: "/mcp-search",
        destination: "https://retriever.run/mcp-finder",
        permanent: true,
      },
      {
        source: "/mcp-search/:path*",
        destination: "https://retriever.run/mcp-finder",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
