import { FC } from 'react';
import { useProductList } from './useProductList';
import { ProductCard } from '../ProductCard/ProductCard';
import Spinner from '@/components/ui/spinner';

export const ProductList: FC = () => {
	const { sortedProducts, user, isPendingProducts } = useProductList();

	if (isPendingProducts) {
		return <Spinner />;
	}
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-28 w-fit mx-auto place-items-center [&>*:hover~*]:opacity-50 [&>*:hover~*]:scale-[0.99]">
			{sortedProducts!.map((product) => (
				<div
					key={product.id}
					className="transition duration-300 hover:opacity-100 hover:scale-100 [&:has(~:hover)]:opacity-50 [&:has(~:hover)]:scale-[0.99]"
				>
					<ProductCard product={product} user={user} />
				</div>
			))}
		</div>
	);
};
