const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost"],
    },
  },
  typescript: {
    tsconfigPath: "tsconfig.json",
  },
};

export default nextConfig;
