import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'img.clerk.com',
			},
		],
	},
	typescript: {
		ignoreBuildErrors: process.env.VERCEL ? true : false, // ignore build errors in production
	},
	eslint: {
		ignoreDuringBuilds: true, // ignore build errors in production
	},
	productionBrowserSourceMaps: false,
};

export default nextConfig;
