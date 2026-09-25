/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/musicsumbit',
  assetPrefix: '/musicsumbit',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
