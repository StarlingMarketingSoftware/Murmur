import { SubscriptionCard } from '@/components/SubscriptionCard';
import { getStripeProductsServer } from '@/lib/stripe/products';

export default async function Subscriptions() {
	// Use the server-side function to get products
	const products = await getStripeProductsServer();

	// If no products are available, show a message
	if (!products || products.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center p-8">
				<h2 className="text-2xl font-bold mb-4">No subscription plans available</h2>
				<p>Please check back later or contact support for assistance.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-wrap gap-6 justify-center p-8">
			{products.map((product) => (
				<SubscriptionCard key={product.id} product={product} />
			))}
		</div>
	);
}
