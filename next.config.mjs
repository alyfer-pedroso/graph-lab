/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["192.168.0.102", "192.168.0.107", "192.168.0.105", "192.168.0.100"],
};

export default nextConfig;
