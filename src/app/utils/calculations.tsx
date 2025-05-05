export const calcAiCreditsFromPrice = (priceInCents: number): number => {
	return Math.floor((priceInCents / 100) * 5);
};

export const getTestEmailCount = (aiEmailCount: number): number => {
	return Math.floor(aiEmailCount / 10);
};
