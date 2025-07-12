'use client';

import { ProductCard } from '@/components/organisms/ProductCard/ProductCard';
import { useStripeProducts } from '@/hooks/queryHooks/useStripeProducts';
import { useMe } from '@/hooks/useMe';
import Spinner from '@/components/ui/spinner';
import { UserRole } from '@prisma/client';

export default function Products() {
	const { data: products, isLoading, error } = useStripeProducts();
	const { user, isPendingUser } = useMe();

	if (isLoading || isPendingUser) {
		return <Spinner />;
	}

	if (user?.role !== UserRole.admin) {
		return (
			<div className="flex flex-col items-center justify-center p-8">
				<h2 className="text-2xl font-bold mb-4">Access Denied</h2>
				<p>You do not have permission to view this page.</p>
			</div>
		);
	}

	if (error || !products || products.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center p-8">
				<h2 className="text-2xl font-bold mb-4">No subscription plans available</h2>
				<p>Please check back later or contact support for assistance.</p>
			</div>
		);
	}

	const sortedProducts = products.sort((a, b) => a.created - b.created);

	return (
		<div className="flex flex-col items-center justify-center p-8">
			<div className="flex flex-wrap gap-6 justify-center p-8">
				{sortedProducts.map((product) => (
					<ProductCard
						isLink
						key={product.id}
						product={product}
						user={user}
						billingCycle="month"
					/>
				))}
			</div>
		</div>
	);
}
