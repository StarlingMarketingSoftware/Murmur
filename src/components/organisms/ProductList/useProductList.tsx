import { useStripeProducts } from '@/hooks/queryHooks/useStripeProducts';
import { useMe } from '@/hooks/useMe';
import { BillingCycle } from '@/types';

export interface ProductListProps {
	billingCycle: BillingCycle;
}

export const useProductList = (props: ProductListProps) => {
	const { billingCycle } = props;
	const { data: products, isPending: isPendingProducts } = useStripeProducts();
	const { user } = useMe();

	const basicYearlyPriceId = process.env.NEXT_PUBLIC_BASIC_YEARLY_PRICE_ID;

	let filteredProducts = products?.filter((product) => product.metadata.main === '1');

	// Always hide the Basic product
	if (basicYearlyPriceId) {
		filteredProducts = filteredProducts?.filter(
			(product) => product.default_price !== basicYearlyPriceId
		);
	}

	const sortedProducts = filteredProducts?.sort(
		(a, b) => Number(a.metadata.order) - Number(b.metadata.order)
	);

	return {
		isPendingProducts,
		sortedProducts,
		user,
		billingCycle,
	};
};
