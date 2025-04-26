'use client';

import { ProductCard } from '@/components/organisms/ProductCard/ProductCard';
import { useMe } from '@/hooks/useMe';
import { useParams } from 'next/navigation';
import { useStripeProduct } from '@/hooks/useStripeProduct';
import { FC } from 'react';

const AdminProducts: FC = () => {
	const { productId } = useParams();
	const { user } = useMe();
	const { data: product, isLoading, error } = useStripeProduct(productId as string);

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {(error as Error).message}</div>;
	if (!product) return <div>Product not found</div>;

	return (
		<div className="flex items-center justify-center h-[90vh] w-full">
			<ProductCard user={user} product={product} />
		</div>
	);
};

export default AdminProducts;
