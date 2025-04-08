'use client';

import ManageSubscriptionButton from '@/components/ManageSubscriptionButton';
import { ProductCard } from '@/app/pricing/_components/ProductCard';
import { useStripeProducts } from '@/hooks/useStripeProducts';
import { useMe } from '@/hooks/useMe';
import Spinner from '@/components/ui/spinner';

export default function Products() {
	const { data: products, isLoading, error } = useStripeProducts();
	const { user } = useMe();

	if (isLoading) {
		return <Spinner />;
	}

	if (error || !products || products.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center p-8">
				<h2 className="text-2xl font-bold mb-4">No subscription plans available</h2>
				<p>Please check back later or contact support for assistance.</p>
			</div>
		);
	}

	const filteredProducts = products.filter((product) => product.metadata.main === '1');

	const sortedProducts = filteredProducts.sort(
		(a, b) => parseInt(a.metadata.order) - parseInt(b.metadata.order)
	);

	return (
		<div className="flex flex-col items-center justify-center p-8">
			<div>{user?.aiDraftCredits}</div>
			<div className="flex flex-wrap gap-6 justify-center p-8">
				{sortedProducts.map((product) => (
					<ProductCard key={product.id} product={product} user={user} />
				))}
			</div>
			{user?.stripeSubscriptionId && <ManageSubscriptionButton />}
		</div>
	);
}
