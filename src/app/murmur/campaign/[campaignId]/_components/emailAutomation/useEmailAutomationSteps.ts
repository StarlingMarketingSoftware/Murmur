import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export const useEmailAutomationSteps = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const stepParam = searchParams.get('step') ?? '1';

	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(searchParams);
		params.set('step', value);
		router.push(`${pathname}?${params.toString()}`);
	};

	const advanceToNextStep = () => {
		const params = new URLSearchParams(searchParams);
		params.set('step', (parseInt(stepParam) + 1).toString());
		router.push(`${pathname}?${params.toString()}`);
	};
	const returnToPreviousStep = () => {
		const params = new URLSearchParams(searchParams);
		params.set('step', (parseInt(stepParam) - 1).toString());
		router.push(`${pathname}?${params.toString()}`);
	};

	return {
		stepParam,
		handleTabChange,
		advanceToNextStep,
		returnToPreviousStep,
	};
};
