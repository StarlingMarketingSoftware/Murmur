import { Prisma } from '@prisma/client';

// Enums
export type CampaignWithRelations = Prisma.CampaignGetPayload<{
	include: {
		signature: true;
		contactLists: true;
		identity: true;
		userContactLists: true;
	};
}>;

// Types
export type EmailWithRelations = Prisma.EmailGetPayload<{
	include: {
		contact: true;
	};
}>;

export type InboundEmailWithRelations = Prisma.InboundEmailGetPayload<{
	include: {
		contact: true;
		campaign: true;
		originalEmail: true;
	};
}>;

export type TestDraftEmail = {
	subject: string;
	message: string;
	contactEmail: string;
};

export type Font =
	| 'Arial'
	| 'serif'
	| 'Courier New'
	| 'Arial Black'
	| 'Arial Narrow'
	| 'Garamond'
	| 'Georgia'
	| 'Tahoma'
	| 'Trebuchet MS'
	| 'Verdana'
	| 'Times New Roman'
	| 'Calibri';
