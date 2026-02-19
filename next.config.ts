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
	compiler: {
		removeConsole: process.env.NODE_ENV === 'production',
	},
	// Include WASM binaries in serverless function bundles on Vercel.
	// Next.js output file tracing detects the JS glue code but misses the
	// .wasm binaries that are loaded via fs.readFileSync at runtime.
	outputFileTracingIncludes: {
		// IMPORTANT: use `**` so nested routes (e.g. `/api/vector-search/...`) also match.
		'/api/**': ['./rust-scorer/pkg-node/**/*'],
		'/murmur/**': ['./rust-scorer/pkg-node/**/*'],
	},
	webpack: (config) => {
		config.experiments = {
			...(config.experiments || {}),
			asyncWebAssembly: true,
		};
		return config;
	},
	// Reduce serverless function size and provisioning time
	experimental: {
		optimizePackageImports: [
			'@clerk/nextjs',
			'@tanstack/react-query',
			'lucide-react',
			'react-icons',
			'@tiptap/react',
			'@tiptap/starter-kit',
			'@tiptap/extension-link',
			'@tiptap/extension-placeholder',
			'@tiptap/extension-underline',
			'lodash',
			'date-fns',
			'gsap',
			'sonner',
			'@radix-ui/react-dialog',
			'@radix-ui/react-dropdown-menu',
			'@radix-ui/react-select',
			'@radix-ui/react-tabs',
			'@radix-ui/react-tooltip',
			'@radix-ui/react-popover',
		],
	},
};

export default nextConfig;
