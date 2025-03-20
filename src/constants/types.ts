export type Url = {
	path: string;
	label: string;
	category?: UrlCategory;
};

export type UrlCategory = 'protected' | 'mainMenu';

// use zod for schema types
