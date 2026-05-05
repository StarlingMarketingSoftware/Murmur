'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';

interface DashboardErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
	useEffect(() => {
		console.error('[dashboard] render error', error);
	}, [error]);

	const isDev = process.env.NODE_ENV === 'development';

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-6 backdrop-blur-md">
			<div className="w-full max-w-md rounded-2xl border border-stone-200/40 bg-stone-50 p-8 shadow-2xl">
				<h1 className="text-xl font-semibold text-primary">
					Something went wrong loading the dashboard
				</h1>
				<p className="mt-3 text-sm leading-relaxed text-secondary">
					We hit an unexpected error while rendering this page. Your data is safe;
					this is just the UI failing to mount. You can try again, or head back
					home.
				</p>

				{isDev && (
					<pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-stone-100 p-3 text-xs leading-relaxed text-stone-700">
						{error.message}
						{error.digest ? `\n\ndigest: ${error.digest}` : ''}
					</pre>
				)}

				<div className="mt-6 flex flex-wrap gap-3">
					<button
						type="button"
						onClick={reset}
						className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-ui-01 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
					>
						Try again
					</button>
					<Link
						href={urls.home.index}
						className="rounded-full border border-stone-300 px-5 py-2 text-sm font-medium text-primary transition hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
					>
						Back to home
					</Link>
				</div>
			</div>
		</div>
	);
}
