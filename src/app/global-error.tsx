'use client';

import { useEffect } from 'react';

// Last-resort backstop. global-error.tsx is the ONLY boundary Next consults for
// throws in the root/layout subtree (where the persistent map is mounted). It
// replaces the root layout, so it must render its own <html>/<body> and cannot
// rely on the app's global CSS — everything here is inline-styled and self-contained.
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error('[global] application error', error);
	}, [error]);

	return (
		<html lang="en">
			<body
				style={{
					margin: 0,
					minHeight: '100vh',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					padding: 24,
					backgroundColor: 'rgba(12, 10, 9, 0.92)',
					fontFamily:
						'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
				}}
			>
				<div
					style={{
						width: '100%',
						maxWidth: 420,
						borderRadius: 16,
						border: '1px solid rgba(231, 229, 228, 0.4)',
						backgroundColor: '#fafaf9',
						padding: 32,
						boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
					}}
				>
					<h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1c1917' }}>
						Something went wrong
					</h1>
					<p
						style={{
							marginTop: 12,
							marginBottom: 0,
							fontSize: 14,
							lineHeight: 1.6,
							color: '#57534e',
						}}
					>
						We hit an unexpected error. Your data is safe — this is just the UI
						failing to render. You can try again, or head back home.
					</p>
					<div
						style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}
					>
						<button
							type="button"
							onClick={() => reset()}
							style={{
								borderRadius: 9999,
								border: 'none',
								backgroundColor: '#1c1917',
								color: '#fafaf9',
								padding: '8px 20px',
								fontSize: 14,
								fontWeight: 500,
								cursor: 'pointer',
							}}
						>
							Try again
						</button>
						{/* Hard navigation (not next/link): on a root crash the client
						    router may be unhealthy, so a full document load is the safe
						    way back home. */}
						{/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
						<a
							href="/"
							style={{
								borderRadius: 9999,
								border: '1px solid #d6d3d1',
								color: '#1c1917',
								padding: '8px 20px',
								fontSize: 14,
								fontWeight: 500,
								textDecoration: 'none',
							}}
						>
							Back to home
						</a>
					</div>
				</div>
			</body>
		</html>
	);
}
