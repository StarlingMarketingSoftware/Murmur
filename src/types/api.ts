export type ApiRouteParams = Promise<{ id: string }>;

export interface CustomQueryOptions {
	filters?: Record<string, string | number>;
}

export interface CustomMutationOptions {
	suppressToasts?: boolean;
	successMessage?: string;
	errorMessage?: string;
	onSuccess?: () => void;
}
