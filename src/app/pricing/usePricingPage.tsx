import { useRef, useState } from 'react';

export const usePricingPage = () => {
	const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');
	const tableRef = useRef<HTMLDivElement>(null);

	const handleScrollToTable = () => {
		tableRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	// const { data: products, isLoading, error } = useStripeProducts();
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

	return {
		billingCycle,
		setBillingCycle,
		tableRef,
		handleScrollToTable,
	};
};
