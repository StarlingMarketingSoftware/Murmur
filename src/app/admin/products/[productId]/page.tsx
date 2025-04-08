'use client';

import { ProductCard } from '@/app/pricing/_components/ProductCard';
import { useMe } from '@/hooks/useMe';
import { useParams } from 'next/navigation';
import { useStripeProduct } from '@/hooks/useStripeProduct';

export const AdminProducts = () => {
	const { productId } = useParams();
	const { user } = useMe();
	const { data: product, isLoading, error } = useStripeProduct(productId as string);

	if (isLoading) return <div>Loading...</div>;
	if (error) return <div>Error: {(error as Error).message}</div>;
	if (!product) return <div>Product not found</div>;

	return <ProductCard user={user} product={product} />;
};

export default AdminProducts;
