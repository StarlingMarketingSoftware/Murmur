import { Draft } from '@/constants/types';
import { Contact } from '@prisma/client';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MurmurState {
	selectedRecipients: Contact[];
	currentTestDraft: Draft | null;
	completedDrafts: Draft[];
}

const initialState: MurmurState = {
	selectedRecipients: [],
	completedDrafts: [],
	currentTestDraft: null,
};

export const murmurSlice = createSlice({
	name: 'murmur',
	initialState,
	reducers: {
		setSelectedRecipients: (state, action: PayloadAction<Contact[]>) => {
			state.selectedRecipients = action.payload;
		},
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

export const {
	setSelectedRecipients,
	setCompletedDrafts,
	setCurrentTestDraft,
	addCompletedDrafts,
} = murmurSlice.actions;

export default murmurSlice.reducer;
