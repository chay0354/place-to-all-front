/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    // Persistent webpack filesystem cache on Windows can reference deleted chunks → MODULE_NOT_FOUND.
    // Slightly slower dev compiles, fewer stale-chunk errors. Production build unchanged.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
