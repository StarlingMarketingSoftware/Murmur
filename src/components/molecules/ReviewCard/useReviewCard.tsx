import { Review } from '@/types';

export interface ReviewCardProps {
	review: Review;
}

export const useReviewCard = (props: ReviewCardProps) => {
	const { review } = props;

	const photoUrl = review.photoUrl || '/images/defaultReviewer.png';

	return {
		review,
		photoUrl,
	};
};
