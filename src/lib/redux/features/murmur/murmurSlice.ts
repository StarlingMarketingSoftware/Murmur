import { Draft } from '@/constants/types';
import { Contact } from '@prisma/client';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MurmurState {
	selectedRecipients: Contact[];
	completedDrafts: Draft[];
}

const initialState: MurmurState = {
	selectedRecipients: [],
	completedDrafts: [],
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
	},
});

export const { setSelectedRecipients, setCompletedDrafts } = murmurSlice.actions;

export default murmurSlice.reducer;
