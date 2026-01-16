import { FC } from 'react';
import { ProductListProps, useProductList } from './useProductList';
import { ProductCard } from '../ProductCard/ProductCard';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { cn } from '@/utils';

export const ProductList: FC<ProductListProps> = (props) => {
	const { sortedProducts, user, isPendingProducts, billingCycle } = useProductList(props);

	if (isPendingProducts) {
		return <Spinner />;
	}

	if (!sortedProducts) {
		return null;
	}

	return (
		<div
			className={cn(
				'grid grid-cols-1 gap-x-[22px] gap-y-[50px] w-fit mx-auto place-items-center',
				'lg:grid-cols-2'
			)}
		>
			{sortedProducts.map((product) => (
				<div key={product.id}>
					<ProductCard product={product} user={user} billingCycle={billingCycle} />
				</div>
			))}
		</div>
	);
};
