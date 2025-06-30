import { ScoredVector } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch/db_data';

export interface PineconeContactMetadata {
	contactId: number;
	email: string;
	firstName: string;
	lastName: string;
	company: string;
	title: string;
}

export interface PineconeContactMatch extends ScoredVector {
	metadata: PineconeContactMetadata;
}
