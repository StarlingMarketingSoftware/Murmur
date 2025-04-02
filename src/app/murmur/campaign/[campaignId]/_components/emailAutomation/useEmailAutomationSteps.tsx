import { CampaignWithRelations } from '@/constants/types';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname, useParams } from 'next/navigation';
import { toast } from 'sonner';
import Send from './send/Send';
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
	const params = useParams<{ campaignId: string }>();
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

	const { mutateAsync: updateCampaign, isPending: isPendingCampaign } = useMutation({
		mutationFn: async (campaignData: Partial<CampaignWithRelations>) => {
			const response = await fetch(`/api/campaigns/${params.campaignId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(campaignData),
			});

			if (!response.ok) {
				toast.error('Failed to save campaign');
				throw new Error('Failed to save campaign');
			}

			return response.json();
		},
		onSuccess: () => {
			toast.success('Campaign updated successfully');
		},
		onError: (error) => {
			if (error instanceof Error) {
				toast.error('Failed to update campaign. Please try again.');
			}
		},
	});

	const handleSaveCampaign = async () => {};

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
			component: <DraftPage />,
		},
		{
			step: 3,
			value: 'send',
			label: 'Send',
			component: <Send />,
		},
	];

	return {
		stepParam,
		handleTabChange,
		advanceToNextStep,
		returnToPreviousStep,
		handleSaveCampaign,
		isPendingCampaign,
		steps,
	};
};
