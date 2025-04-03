import { Draft } from '@/constants/types';

export interface PreviewTestDraftDialogProps {
	draftEmail: Draft;
}

export const usePreviewTestDraftDialog = (props: PreviewTestDraftDialogProps) => {
	const { draftEmail } = props;
	return { draftEmail };
};
