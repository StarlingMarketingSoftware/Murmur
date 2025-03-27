export const getPath = (url: string): string => {
	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
	return url.substring(baseUrl!.length, url.length);
};
