import { BillingCycle } from '@/types';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const getBillingCycleFromParam = (value: string | null): BillingCycle | null => {
	if (value === 'month' || value === 'year') return value;
	return null;
};

export const usePricingPage = () => {
	const searchParams = useSearchParams();
	const [billingCycle, setBillingCycle] = useState<BillingCycle>(
		() => getBillingCycleFromParam(searchParams.get('checkoutBillingCycle')) ?? 'month'
	);
	const tableRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const checkoutBillingCycle = getBillingCycleFromParam(
			searchParams.get('checkoutBillingCycle')
		);
		if (!checkoutBillingCycle) return;
		setBillingCycle(checkoutBillingCycle);
	}, [searchParams]);

	const handleScrollToTable = () => {
		tableRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	return {
		billingCycle,
		setBillingCycle,
		tableRef,
		handleScrollToTable,
	};
};
