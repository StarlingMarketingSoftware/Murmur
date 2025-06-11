'use client';

import ManageSubscriptionButton from '@/components/organisms/ManageSubscriptionButton/ManageSubscriptionButton';
import { useMe } from '@/hooks/useMe';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';

export default function Products() {
	// const { data: products, isLoading, error } = useStripeProducts();
	const { user } = useMe();

	// if (isLoading) {
	// 	return <Spinner />;
	// }

	// if (error || !products || products.length === 0) {
	// 	return (
	// 		<div className="flex flex-col items-center justify-center p-8">
	// 			<h2 className="text-2xl font-bold mb-4">No subscription plans available</h2>
	// 			<p>Please check back later or contact support for assistance.</p>
	// 		</div>
	// 	);
	// }

	// const filteredProducts = products.filter((product) => product.metadata.main === '1');

	// const sortedProducts = filteredProducts.sort(
	// 	(a, b) => Number(a.metadata.order) - Number(b.metadata.order)
	// );

	return (
		<AppLayout>
			{/* <div className="flex flex-wrap gap-6 justify-center p-8">
				{sortedProducts.map((product) => (
					<ProductCard key={product.id} product={product} user={user} />
				))}
			</div> */}
			<Typography>Pricing</Typography>
			<Typography variant="p">
				Standard pricing plans are coming soon. In the meantime, you can manage your
				subscription below. For upgrades, please contact us for a custom plan.
			</Typography>
			<div className="w-full flex items-center justify-center">
				{user?.stripeSubscriptionId ? (
					<ManageSubscriptionButton className="mx-auto my-8" />
				) : (
					<Button className="mx-auto my-8" disabled>
						You are not subscribed yet.
					</Button>
				)}
			</div>
		</AppLayout>
	);
}
