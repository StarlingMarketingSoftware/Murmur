export const getPath = (url: string): string => {
	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
	return url.substring(baseUrl!.length, url.length);
};

export const ellipsesText = (text: string, maxLength: number): string => {
	if (text.length > maxLength) {
		return text.substring(0, maxLength) + '...';
	}
	return text;
};
