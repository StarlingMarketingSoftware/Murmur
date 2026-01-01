/**
 * Check if a title matches "Restaurants <state>" or "Restaurant <state>" pattern
 */
export const isRestaurantTitle = (title: string): boolean => {
	return /^restaurants?\s/i.test(title.trim());
};

/**
 * Check if a title matches "Coffee Shops <state>" or "Coffee Shop <state>" pattern
 */
export const isCoffeeShopTitle = (title: string): boolean => {
	return /^coffee\s*shops?\s/i.test(title.trim());
};

/**
 * Check if a title matches "Music Venues <state>" or "Music Venue <state>" pattern
 */
export const isMusicVenueTitle = (title: string): boolean => {
	return /^music\s*venues?\s/i.test(title.trim());
};

/**
 * Check if a title matches "Music Festivals <state>" or "Music Festival <state>" pattern
 */
export const isMusicFestivalTitle = (title: string): boolean => {
	return /^music\s*festivals?\s/i.test(title.trim());
};

/**
 * Check if a title matches "Wedding Planners <state>" or "Wedding Planner <state>" pattern
 */
export const isWeddingPlannerTitle = (title: string): boolean => {
	return /^wedding\s*planners?\s/i.test(title.trim());
};

/**
 * Check if a title matches "Wedding Venues <state>" or "Wedding Venue <state>" pattern
 */
export const isWeddingVenueTitle = (title: string): boolean => {
	return /^wedding\s*venues?\s/i.test(title.trim());
};

/**
 * Check if a title matches "Wineries <state>" or "Winery <state>" pattern
 */
export const isWineryTitle = (title: string): boolean => {
	return /^winer(y|ies)\s/i.test(title.trim());
};

/**
 * Check if a title matches "Breweries <state>" or "Brewery <state>" pattern
 */
export const isBreweryTitle = (title: string): boolean => {
	return /^brewer(y|ies)\s/i.test(title.trim());
};

/**
 * Check if a title matches "Distilleries <state>" or "Distillery <state>" pattern
 */
export const isDistilleryTitle = (title: string): boolean => {
	return /^distiller(y|ies)\s/i.test(title.trim());
};

/**
 * Check if a title matches "Cideries <state>" or "Cidery <state>" pattern
 */
export const isCideryTitle = (title: string): boolean => {
	return /^cider(y|ies)\s/i.test(title.trim());
};

/**
 * Check if a title matches any wine/beer/spirits category
 */
export const isWineBeerSpiritsTitle = (title: string): boolean => {
	return isWineryTitle(title) || isBreweryTitle(title) || isDistilleryTitle(title) || isCideryTitle(title);
};

/**
 * Get the display label for wine/beer/spirits categories
 */
export const getWineBeerSpiritsLabel = (title: string): string | null => {
	if (isWineryTitle(title)) return 'Winery';
	if (isBreweryTitle(title)) return 'Brewery';
	if (isDistilleryTitle(title)) return 'Distillery';
	if (isCideryTitle(title)) return 'Cidery';
	return null;
};

