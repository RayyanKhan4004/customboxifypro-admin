import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:3001";
console.log(backendOrigin);
const nextConfig: NextConfig = {
  async rewrites() {
    // Same-origin proxy: the browser only talks to the admin origin, so
    // httpOnly auth cookies set by the backend flow naturally and CORS is moot.
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
