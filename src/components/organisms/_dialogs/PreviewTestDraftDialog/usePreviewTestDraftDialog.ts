import { TestDraftEmail } from '@/types';
import { useMe } from '@/hooks/useMe';

export interface PreviewTestDraftDialogProps {
	draftEmail: TestDraftEmail;
}

export const usePreviewTestDraftDialog = (props: PreviewTestDraftDialogProps) => {
	const { draftEmail } = props;
	const { subscriptionTier } = useMe();
	const canViewEmailAddress = subscriptionTier?.viewEmailAddresses;

	return { draftEmail, canViewEmailAddress };
};
