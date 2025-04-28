import { Draft } from '@/constants/types';
import { useMe } from '@/hooks/useMe';

export interface PreviewTestDraftDialogProps {
	draftEmail: Draft;
}

export const usePreviewTestDraftDialog = (props: PreviewTestDraftDialogProps) => {
	const { draftEmail } = props;
	const { subscriptionTier } = useMe();
	const canViewEmailAddress = subscriptionTier?.viewEmailAddresses;

	return { draftEmail, canViewEmailAddress };
};
