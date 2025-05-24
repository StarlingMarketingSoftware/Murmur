interface ApolloOrganization {
	id?: string;
	name?: string;
	website_url?: string;
	organization_id?: string;
	domain?: string;
}

export interface ApolloPerson {
	id: string;
	name: string;
	first_name?: string;
	last_name?: string;
	email?: string;
	title?: string;
	organization: ApolloOrganization;
	phone_numbers?: string[];
	state?: string;
	country?: string;
	city?: string;
	email_status?: 'verified' | 'high_confidence' | 'medium_confidence' | 'low_confidence';
	departments?: string[];
	subdepartments?: string[];
	seniority?: string;
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
