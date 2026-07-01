import { Client } from '@elastic/elasticsearch';
import type { Contact } from '@prisma/client';

// ES-backed replacement for the engine's Prisma hydration seam
// (FreeTextSearchDeps.hydrateContacts). The dev Postgres holds DIFFERENT ids
// than the dev ES index (which mirrors production), so hydrating candidate
// ids from Prisma locally returns a near-empty, geographically scrambled set
// regardless of code correctness. Building synthetic Contact rows from the ES
// documents themselves lets the harness exercise the full pipeline —
// parse → dispatch → retrievers → RRF → hydration shape → scoring → gates —
// judged purely by ES-side fields.
//
// Field semantics mirror the legacy route's buildContactFromEsMetadata
// (src/app/api/contacts/route.ts:297-348): companyKeywords/companyTechStack
// are ", "-joined strings in ES docs but String[] in Prisma (a raw copy
// throws in distribution.ts), and latitude/longitude must be rebuilt from
// the ES geo_point `coordinates` or every row is deleted by the engine's
// locality nets.

const toStringArray = (value: unknown): string[] =>
	Array.isArray(value)
		? value.map((entry) => String(entry).trim()).filter(Boolean)
		: value != null
		? String(value)
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean)
		: [];

const asNullableString = (value: unknown): string | null =>
	value == null ? null : String(value);

const asFiniteNumber = (value: unknown): number | null => {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

export const contactFromEsDoc = (
	esId: string,
	source: Record<string, unknown>
): Contact | null => {
	const parsedId = asFiniteNumber(source.contactId ?? esId);
	if (parsedId == null || !Number.isFinite(parsedId)) return null;
	const coords = source.coordinates as
		| { lat?: unknown; lon?: unknown }
		| null
		| undefined;
	const now = new Date(0); // fixed epoch — deterministic across runs

	const contact: Partial<Contact> = {
		id: Math.trunc(parsedId),
		apolloPersonId: null,
		firstName: asNullableString(source.firstName),
		lastName: asNullableString(source.lastName),
		email: asNullableString(source.email) ?? '',
		company: asNullableString(source.company),
		city: asNullableString(source.city),
		state: asNullableString(source.state),
		country: asNullableString(source.country),
		address: asNullableString(source.address),
		phone: null,
		website: asNullableString(source.website),
		title: asNullableString(source.title),
		headline: asNullableString(source.headline),
		linkedInUrl: null,
		photoUrl: null,
		metadata: asNullableString(source.metadata),
		companyLinkedInUrl: null,
		companyFoundedYear: asNullableString(source.companyFoundedYear),
		companyType: asNullableString(source.companyType),
		companyTechStack: toStringArray(source.companyTechStack),
		companyPostalCode: null,
		companyKeywords: toStringArray(source.companyKeywords),
		companyIndustry: asNullableString(source.companyIndustry),
		latitude: asFiniteNumber(coords?.lat),
		longitude: asFiniteNumber(coords?.lon),
		isPrivate: false,
		hasVectorEmbedding: true,
		userContactListCount: 0,
		manualDeselections: 0,
		lastResearchedDate: null,
		emailValidationSubStatus: null,
		emailValidatedAt: null,
		createdAt: now,
		updatedAt: now,
	};
	// emailValidationStatus is a Prisma enum; 'valid' matches the value the
	// index is populated from. Cast keeps the script schema-drift tolerant.
	(contact as Record<string, unknown>).emailValidationStatus = 'valid';
	return contact as Contact;
};

export const createEsHydrator = (
	client: Client,
	indexName = 'contacts'
): ((ids: number[]) => Promise<Contact[]>) => {
	return async (ids: number[]): Promise<Contact[]> => {
		if (ids.length === 0) return [];
		const res = await client.mget<Record<string, unknown>>({
			index: indexName,
			ids: ids.map((id) => String(id)),
		});
		const out: Contact[] = [];
		for (const doc of res.docs) {
			if (!('found' in doc) || !doc.found) continue;
			const contact = contactFromEsDoc(doc._id ?? '', doc._source ?? {});
			if (contact) out.push(contact);
		}
		return out;
	};
};
