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
		ignoreDuringBuilds: process.env.VERCEL ? true : false, // ignore build errors in production
	},
	productionBrowserSourceMaps: false,
	transpilePackages: ['gsap', 'lenis'],
	// Optimize for Vercel deployment
	swcMinify: true,
	compiler: {
		removeConsole: process.env.NODE_ENV === 'production',
	},
};

export default nextConfig;
