import ManageSubscriptionButton from '@/components/ManageSubscriptionButton';
import { ProductCard } from '@/app/pricing/_components/ProductCard';
import { getStripeProducts } from '@/utils/data/stripe/products';
import { getUser } from '@/utils/data/users/getUser';

export default async function Products() {
	const products = await getStripeProducts();
	const user = await getUser();

	console.log('🚀 ~ Products ~ products:', products);

	if (!products || products.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center p-8">
				<h2 className="text-2xl font-bold mb-4">No subscription plans available</h2>
				<p>Please check back later or contact support for assistance.</p>
			</div>
		);
	}

	const sortedProducts = products.sort(
		(a, b) => parseInt(a.metadata.order) - parseInt(b.metadata.order)
	);

	return (
		<div className="flex flex-col items-center justify-center p-8">
			<div className="flex flex-wrap gap-6 justify-center p-8">
				{sortedProducts.map((product) => (
					<ProductCard key={product.id} product={product} user={user} />
				))}
			</div>
			<ManageSubscriptionButton />
		</div>
	);
}
