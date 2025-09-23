// import { Contact } from '@prisma/client';
import { contactEmbeddings1 } from './contactEmbeddings1';
import { contactEmbeddings2 } from './contactEmbeddings2';

export interface ContactEmbedding {
	id: string;
	embedding: number[];
}

// Temporary interface to avoid Prisma build issues
interface Contact {
	id: string | number;
}

// Combines data from separate contact embeddings files to avoid Github file size limit
export function getEmbeddingForContact(contact: Contact): ContactEmbedding | undefined {
	const contactEmbeddings = [...contactEmbeddings1, ...contactEmbeddings2];
	return contactEmbeddings.find((e) => e.id === String(contact.id));
}
