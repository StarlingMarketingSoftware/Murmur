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

