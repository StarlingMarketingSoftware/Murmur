import { FC } from 'react';
import { ProductListProps, useProductList } from './useProductList';
import { ProductCard } from '../ProductCard/ProductCard';
import Spinner from '@/components/ui/spinner';

export const ProductList: FC<ProductListProps> = (props) => {
	const { sortedProducts, user, isPendingProducts } = useProductList(props);

	if (isPendingProducts) {
		return <Spinner />;
	}

	return (
		<div className="flex gap-23 w-full mx-auto items-center justify-center flex-wrap">
			{sortedProducts!.map((product) => (
				<ProductCard key={product.id} product={product} user={user} />
			))}
		</div>
	);
};
