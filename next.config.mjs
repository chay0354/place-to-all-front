/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporary: emit browser source maps so production stack traces map to real component names.
  productionBrowserSourceMaps: true,
  // Avoid broken ./vendor-chunks/@supabase.js MODULE_NOT_FOUND on Windows dev (server bundles).
  experimental: {
    serverComponentsExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  },
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
