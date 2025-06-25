import { Prisma } from '@prisma/client';

// Enums
export type CampaignWithRelations = Prisma.CampaignGetPayload<{
	include: {
		signature: true;
		contactLists: true;
		identity: true;
	};
}>;

// Types
export type EmailWithRelations = Prisma.EmailGetPayload<{
	include: {
		contact: true;
	};
}>;

export type TestDraftEmail = {
	subject: string;
	message: string;
	contactEmail: string;
};

export type Font = 'Times New Roman' | 'Arial' | 'Calibri' | 'Georgia' | 'Courier New';
