import { FC } from 'react';
import { ProductListProps, useProductList } from './useProductList';
import { ProductCard } from '../ProductCard/ProductCard';
import Spinner from '@/components/ui/spinner';

export const ProductList: FC<ProductListProps> = (props) => {
	const { sortedProducts, user, isPendingProducts, billingCycle } = useProductList(props);

	if (isPendingProducts) {
		return <Spinner />;
	}
	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 md:gap-5 lg:gap-5 xl:gap-28 w-fit mx-auto place-items-center [&>*:hover~*]:opacity-50 [&>*:hover~*]:scale-[0.99]">
			{sortedProducts!.map((product) => (
				<div
					key={product.id}
					className="transition duration-300 hover:opacity-100 hover:scale-100 [&:has(~:hover)]:opacity-50 [&:has(~:hover)]:scale-[0.99]"
				>
					<ProductCard product={product} user={user} billingCycle={billingCycle} />
				</div>
			))}
		</div>
	);
};
