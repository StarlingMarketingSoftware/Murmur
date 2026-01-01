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

