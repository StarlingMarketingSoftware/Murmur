import { EmailVerificationStatus } from '@prisma/client';

interface ApolloOrganization {
	id?: string;
	name?: string;
	website_url?: string;
	organization_id?: string;
	domain?: string;
}

type ApolloPhoneNumber = {
	sanitized_number: string;
};

type ApolloContact = {
	present_raw_address?: string;
	organization_name?: string;
	phone_numbers?: ApolloPhoneNumber[];
};

export interface ApolloPerson {
	id: string; // the personId in Apollo
	first_name?: string;
	last_name?: string;
	email: string;
	email_status?: EmailVerificationStatus; // this may be null
	title?: string;
	headline?: string;
	organization_id?: string;
	organization_name: string;
	contact?: ApolloContact;
	city?: string;
	state?: string;
	country?: string;
	photo_url?: string;
	linkedin_url?: string;
}

export interface ApolloSearchResponse {
	organizations: Array<ApolloOrganization>;
	people: Array<ApolloPerson>;
	partial_results_only: boolean;
	pagination: {
		page: number;
		per_page: number;
		total_entries: number;
		total_pages: number;
	};
}

export type ApolloPeopleSearch = {
	person_titles?: string[]; // the more you add, the more results you get
	include_similar_titles?: boolean; // if true, Apollo will return results that are similar to the titles you provide
	person_locations?: string[]; // cities, countries, and US states are supported
	person_seniorities?: string[]; // ONLY the following values are supported: owner, founder, c_suite, partner, vp, head, director, manager, senior, entry, intern
	organization_locations?: string[]; // The location of the company headquarters for a person's current employer. Cities, US states, and countries are supported
	contact_email_status?: string[]; // verified, unverified, likely to engage, unavailable, Set this to ['verified', 'likely to engage']
	organization_num_employees_ranges?: string[]; // The number of employees at a person's current employer. Each range consists of two numbers separated by a comma. Examples: 1,10; 250,500; 10000,20000
	q_keywords?: string; // Keywords to search for in a person's profile. This only searches for exact matches, so use it sparingly
};
