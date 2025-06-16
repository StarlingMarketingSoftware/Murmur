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
		<div className="flex gap-23 w-full mx-auto items-center justify-center flex-wrap group">
			{sortedProducts!.map((product) => (
				<div
					key={product.id}
					className="transition duration-300 group-hover:opacity-50 group-hover:scale-99 hover:!opacity-100 hover:!scale-100"
				>
					<ProductCard product={product} user={user} />
				</div>
			))}
		</div>
	);
};
