import { useStripeProducts } from '@/hooks/queryHooks/useStripeProducts';
import { useMe } from '@/hooks/useMe';
import { BillingCycle } from '@/types';

export interface ProductListProps {
	billingCycle: BillingCycle;
}

export const useProductList = (props: ProductListProps) => {
	const { billingCycle } = props;
	const { data: products, isPending: isPendingProducts } = useStripeProducts();
	const filteredProducts = products?.filter((product) => product.metadata.main === '1');

	const sortedProducts = filteredProducts?.sort(
		(a, b) => Number(a.metadata.order) - Number(b.metadata.order)
	);
	const { user } = useMe();

	return {
		isPendingProducts,
		sortedProducts,
		user,
		billingCycle,
	};
};
