import { Draft } from '@/types/types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CampaignState {
	campaignId: string;
	campaignName: string;
	recipients: {
		selectedContactLists: string[]; // Contact list ids only
		step2: boolean;
		selectedRecipients: string[]; // Contact ids only
	};
	currentTestDraft: Draft | null;
	completedDrafts: Draft[];
}

const initialState: CampaignState = {
	campaignId: '',
	campaignName: '',
	recipients: {
		selectedContactLists: [],
		step2: false,
		selectedRecipients: [],
	},
	completedDrafts: [],
	currentTestDraft: null,
};

export const murmurSlice = createSlice({
	name: 'murmur',
	initialState,
	reducers: {
		setCompletedDrafts: (state, action: PayloadAction<Draft[]>) => {
			state.completedDrafts = action.payload;
		},
		setCurrentTestDraft: (state, action: PayloadAction<Draft | null>) => {
			state.currentTestDraft = action.payload;
		},
		addCompletedDrafts: (state, action: PayloadAction<Draft>) => {
			state.completedDrafts.push(action.payload);
		},
	},
});

export const { setCompletedDrafts, setCurrentTestDraft, addCompletedDrafts } =
	murmurSlice.actions;

export default murmurSlice.reducer;
