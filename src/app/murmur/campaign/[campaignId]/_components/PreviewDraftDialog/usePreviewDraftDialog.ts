import { Draft } from '@/constants/types';

export interface PreviewDraftDialogProps {
	draftEmail: Draft;
}

export const usePreviewDraftDialog = (props: PreviewDraftDialogProps) => {
	const { draftEmail } = props;
	return { draftEmail };
};
