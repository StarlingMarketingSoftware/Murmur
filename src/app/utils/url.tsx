import { z } from 'zod';
import queryString from 'query-string';

/**
 * Get a number from URL search params
 * @returns number | null
 */
export const getNumberUrlParam = (url: string, param: string): number | null => {
	const value = new URL(url).searchParams.get(param);
	if (!value) return null;
	const num = parseInt(value, 10);
	return isNaN(num) ? null : num;
};

/**
 * Get a string from URL search params
 * @returns string | null
 */
export const getStringUrlParam = (url: string, param: string): string | null => {
	return new URL(url).searchParams.get(param);
};

export const getValidatedParamsFromUrl = <T extends z.ZodRawShape>(
	url: string,
	schema: z.ZodObject<T>
): z.SafeParseReturnType<z.infer<z.ZodObject<T>>, z.infer<z.ZodObject<T>>> => {
	const searchParams = Object.fromEntries(new URL(url).searchParams);
	return schema.safeParse(searchParams);
};

// const removeTrailingSlash = (str: string): string => {
// 	return str.endsWith('/') ? str.slice(0, -1) : str;
// };

export const appendQueryParamsToUrl = (
	url: string,
	obj?: Record<string, string | number | boolean | undefined>
): string => {
	if (!obj) {
		return url;
	}
	const query = queryString.stringify(obj);
	return `${url}?${query}`;
};
