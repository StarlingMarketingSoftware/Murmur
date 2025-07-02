import { Contact } from '@prisma/client';

export interface ContactEmbedding {
	id: string;
	embedding: number[];
}

// This is where we'll store pre-computed embeddings for our test data
export const contactEmbeddings: ContactEmbedding[] = [];

// Helper function to get embedding for a contact
export function getEmbeddingForContact(contact: Contact): ContactEmbedding | undefined {
	return contactEmbeddings.find((e) => e.id === String(contact.id));
}
