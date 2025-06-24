import { CampaignWithRelations } from '@/types';
import { useFormContext } from 'react-hook-form';

export interface AiComposeProps {
	campaign: CampaignWithRelations;
}

const useAiCompose = (props: AiComposeProps) => {
	const { campaign } = props;
	const form = useFormContext();

	return {
		form,
		handleFormAction,
		isTest,
		isPendingGeneration,
		dataDraftEmail,
		handleSavePrompt,
		isPendingSavePrompt,
		aiDraftCredits,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
		selectedSignature,
		generationProgress,
		setGenerationProgress,
		cancelGeneration,
		campaign,
		contacts,
	};
};

export default useAiCompose;
