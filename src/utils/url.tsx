import { z } from 'zod';
import queryString from 'query-string';
import { EmailVerificationStatus } from '@prisma/client';

/**
 * Get a number from URL search params
 * @returns number | null
 */
export const getNumberUrlParam = (url: string, param: string): number | null => {
	const value = new URL(url).searchParams.get(param);
	if (!value) return null;
	const num = Number(value);
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
	const urlObj = new URL(url);
	const searchParams = queryString.parse(urlObj.search, {
		arrayFormat: 'bracket',
		parseNumbers: true,
		parseBooleans: true,
	});
	return schema.safeParse(searchParams);
};

// const removeTrailingSlash = (str: string): string => {
// 	return str.endsWith('/') ? str.slice(0, -1) : str;
// };

export const appendQueryParamsToUrl = (
	url: string,
	obj?: Record<string, string[] | number[] | string | number | boolean | undefined>
): string => {
	if (!obj) {
		return url;
	}
	const query = queryString.stringify(obj, {
		arrayFormat: 'bracket', // Converts arrays to format: key[]=value1&key[]=value2
		skipNull: true,
		skipEmptyString: true,
	});
	return `${url}?${query}`;
};
