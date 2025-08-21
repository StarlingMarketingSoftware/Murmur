import { BillingCycle } from '@/types';
import { useRef, useState } from 'react';

export const usePricingPage = () => {
	const [billingCycle, setBillingCycle] = useState<BillingCycle>('year');
	const tableRef = useRef<HTMLDivElement>(null);

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
