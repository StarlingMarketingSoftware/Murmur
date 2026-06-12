import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware

const isProtectedRoute = createRouteMatcher([
	'/api/((?!webhooks).*)$',
	'/admin/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
	// Mailgun POSTs inbound email to /api/inbound without a Clerk session; that POST
	// authenticates via its own Mailgun signature (verified in the route). The GET on
	// the same path (user inbox) stays protected.
	const isPublicInboundWebhook =
		req.method === 'POST' && req.nextUrl.pathname === '/api/inbound';

	if (isProtectedRoute(req) && !isPublicInboundWebhook) {
		await auth.protect();
	}
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		// Always run for API routes
		'/(api|trpc)(.*)',
	],
};
