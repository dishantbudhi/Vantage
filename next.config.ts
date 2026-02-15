import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimized image handling (no images to optimize in this app)
  images: {
    unoptimized: true,
  },

  // Cache-Control headers for static data files
  async headers() {
    return [
      {
        source: "/countries.geojson",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
