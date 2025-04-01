import { Draft } from '@/constants/types';
import { Campaign, Contact, ContactList } from '@prisma/client';
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
		setCampaignState: (state, action: PayloadAction<Campaign>) => {
			state.campaignId = action.payload.id;
			state.campaignName = action.payload.name;
			// state.recipients.selectedContactLists = action.payload.contactLists.map(());
		},
		setSelectedContactLists: (state, action: PayloadAction<ContactList[]>) => {
			state.recipients.selectedContactLists = action.payload.map((list) => list.id);
		},
		setStep2: (state, action: PayloadAction<boolean>) => {
			state.recipients.step2 = action.payload;
		},
		setSelectedRecipients: (state, action: PayloadAction<Contact[]>) => {
			state.recipients.selectedRecipients = action.payload.map((contact) => contact.id);
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
	setCampaignState,
	setSelectedContactLists,
	setStep2,
	setSelectedRecipients,
	setCompletedDrafts,
	setCurrentTestDraft,
	addCompletedDrafts,
} = murmurSlice.actions;

export default murmurSlice.reducer;
