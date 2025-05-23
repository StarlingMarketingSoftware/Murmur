import { Prisma } from '@prisma/client';

// Enums
export type CampaignWithRelations = Prisma.CampaignGetPayload<{
	include: {
		contacts: true;
		emails: true;
		signature: true;
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
