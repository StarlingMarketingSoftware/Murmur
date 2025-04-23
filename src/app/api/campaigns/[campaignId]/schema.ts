import { z } from 'zod';

export const updateCampaignSchema = z.object({
	name: z.string().optional(),
	subject: z.string().nullable().optional(),
	message: z.string().nullable().optional(),
	testSubject: z.string().nullable().optional(),
	testMessage: z.string().nullable().optional(),
	senderEmail: z.string().nullable().optional(),
	senderName: z.string().nullable().optional(),
	aiModel: z.enum(['sonar', 'sonar_pro']).nullable().optional(),
	signatureId: z.number().optional(),
	contactOperation: z
		.object({
			action: z.enum(['connect', 'disconnect']),
			contactIds: z.array(z.number()),
		})
		.optional(),
});
