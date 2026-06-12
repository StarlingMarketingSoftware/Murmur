import {
	apiResponse,
	handleApiError,
	apiBadRequest,
	apiUnauthorized,
	apiNotFound,
	apiServerError,
} from '@/app/api/_utils';
import { stripe } from '@/stripe/client';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

const postPortalChangePlanSchema = z.object({
	customerId: z.string().min(1),
	returnUrl: z.string().min(1),
});

export type PostPortalChangePlanData = z.infer<typeof postPortalChangePlanSchema>;

// Stripe caps subscription_update at 10 products per portal configuration.
const MAX_PORTAL_PRODUCTS = 10;

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const user = await prisma.user.findUnique({
			where: {
				clerkId: userId,
			},
		});

		if (!user) {
			return apiNotFound();
		}

		const data = await req.json();
		const validatedData = postPortalChangePlanSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { customerId, returnUrl } = validatedData.data;

		if (user.stripeCustomerId !== customerId) {
			return apiBadRequest('Customer ID does not match authenticated user');
		}

		// prices.list (not search) — search caps queries at 10 filter clauses and
		// disallows mixing AND/OR, while one list call returns everything needed.
		const [products, prices] = await Promise.all([
			stripe.products.list({ active: true, limit: 100 }),
			stripe.prices.list({ active: true, type: 'recurring', limit: 100 }),
		]);

		// The portal only accepts active recurring prices, with at most ONE price per
		// billing interval per product (legacy + current monthly prices coexist in
		// this account) — prefer the env-configured price the pricing page sells,
		// then the newest. Products with no surviving price must be dropped (an
		// empty prices array is a Stripe 400). If more products remain than the
		// portal allows, keep the marketed plans (metadata.main='1', ordered by
		// metadata.order) — the same dial the pricing page uses.
		const configuredPriceIds = new Set(
			Object.entries(process.env)
				.filter(([key]) => key.startsWith('NEXT_PUBLIC_') && key.endsWith('_PRICE_ID'))
				.map(([, value]) => value)
				.filter(Boolean)
		);
		const pickPerInterval = (candidates: typeof prices.data) => {
			const byInterval = new Map<string, (typeof prices.data)[number]>();
			const ranked = [...candidates].sort((a, b) => {
				const configuredDiff =
					Number(configuredPriceIds.has(b.id)) - Number(configuredPriceIds.has(a.id));
				if (configuredDiff !== 0) return configuredDiff;
				return b.created - a.created;
			});
			for (const price of ranked) {
				const interval = price.recurring?.interval ?? 'month';
				if (!byInterval.has(interval)) byInterval.set(interval, price);
			}
			return [...byInterval.values()];
		};
		const portalProducts = products.data
			.map((product) => ({
				product,
				prices: pickPerInterval(
					prices.data.filter((price) => price.product === product.id)
				).map((price) => price.id),
			}))
			.filter((entry) => entry.prices.length > 0)
			.sort((a, b) => {
				const mainDiff =
					Number(b.product.metadata.main === '1') -
					Number(a.product.metadata.main === '1');
				if (mainDiff !== 0) return mainDiff;
				return (
					(Number(a.product.metadata.order) || 0) -
					(Number(b.product.metadata.order) || 0)
				);
			})
			.slice(0, MAX_PORTAL_PRODUCTS)
			.map(({ product, prices: priceIds }) => ({
				product: product.id,
				prices: priceIds,
			}));

		if (portalProducts.length === 0) {
			return apiServerError('No active plans available for subscription updates');
		}

		const portalConfig = await stripe.billingPortal.configurations.create({
			business_profile: {
				headline: 'Manage Your Subscription',
			},
			features: {
				subscription_update: {
					enabled: true,
					default_allowed_updates: ['price'],
					proration_behavior: 'always_invoice',
					products: portalProducts,
				},
				subscription_cancel: {
					enabled: true,
				},
				payment_method_update: {
					enabled: true,
				},
				invoice_history: {
					enabled: true,
				},
			},
		});

		const portalSession = await stripe.billingPortal.sessions.create({
			customer: customerId,
			configuration: portalConfig.id,
			return_url: returnUrl,
		});

		return apiResponse({ url: portalSession.url });
	} catch (error) {
		return handleApiError(error);
	}
}
