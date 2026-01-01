/**
 * Check if a title matches "Restaurants <state>" or "Restaurant <state>" pattern
 */
export const isRestaurantTitle = (title: string): boolean => {
	return /^restaurants?\s/i.test(title.trim());
};

