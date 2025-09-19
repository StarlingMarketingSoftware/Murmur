// Client-safe Prisma enum constants
// These match the Prisma schema enums but can be safely imported in client components

export const EmailStatus = {
	draft: 'draft',
	scheduled: 'scheduled',
	sent: 'sent',
	failed: 'failed',
} as const;

export const DraftingMode = {
	ai: 'ai',
	hybrid: 'hybrid',
	handwritten: 'handwritten',
} as const;

export const DraftingTone = {
	normal: 'normal',
	explanatory: 'explanatory',
	formal: 'formal',
	concise: 'concise',
	casual: 'casual',
} as const;

export const UserRole = {
	user: 'user',
	admin: 'admin',
} as const;

export const EmailVerificationStatus = {
	valid: 'valid',
	invalid: 'invalid',
	catch_all: 'catch_all',
	spamtrap: 'spamtrap',
	abuse: 'abuse',
	do_not_mail: 'do_not_mail',
	unknown: 'unknown',
} as const;

export const ContactVerificationRequestStatus = {
	processing: 'processing',
	completed: 'completed',
	failed: 'failed',
} as const;

// Type exports
export type EmailStatus = (typeof EmailStatus)[keyof typeof EmailStatus];
export type DraftingMode = (typeof DraftingMode)[keyof typeof DraftingMode];
export type DraftingTone = (typeof DraftingTone)[keyof typeof DraftingTone];
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export type EmailVerificationStatus =
	(typeof EmailVerificationStatus)[keyof typeof EmailVerificationStatus];
export type ContactVerificationRequestStatus =
	(typeof ContactVerificationRequestStatus)[keyof typeof ContactVerificationRequestStatus];
