/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Rewrites the barrel imports (`import { Search } from "lucide-react"`)
    // used across ~52 files into per-icon module imports, so only the ~34
    // icons actually referenced end up in the bundle.
    optimizePackageImports: ["lucide-react"],
  },
}

export default nextConfig
