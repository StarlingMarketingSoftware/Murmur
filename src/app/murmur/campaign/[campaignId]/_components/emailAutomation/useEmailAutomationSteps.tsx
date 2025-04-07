import { CampaignWithRelations } from '@/constants/types';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import SendPage from './send/SendPage';
import DraftPage from './draft/DraftPage';
import SelectRecipients from './recipients/RecipientsPage';
import { ReactNode } from 'react';

export interface EmailAutomationStepsProps {
	campaign: CampaignWithRelations;
}

type Step = {
	step: number;
	value: string;
	label: string;
	component: ReactNode;
};

export const useEmailAutomationSteps = (props: EmailAutomationStepsProps) => {
	const { campaign } = props;
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

	const steps: Step[] = [
		{
			step: 1,
			value: 'recipients',
			label: 'Recipients',
			component: <SelectRecipients campaign={campaign} />,
		},
		{
			step: 2,
			value: 'draft',
			label: 'Draft',
			component: <DraftPage campaign={campaign} />,
		},
		{
			step: 3,
			value: 'send',
			label: 'Send',
			component: <SendPage campaign={campaign} />,
		},
	];

	return {
		stepParam,
		handleTabChange,
		advanceToNextStep,
		returnToPreviousStep,
		steps,
	};
};
