import { FC } from 'react';
import { ReviewCardProps, useReviewCard } from './useReviewCard';
import { Typography } from '@/components/ui/typography';
import Image from 'next/image';

export const ReviewCard: FC<ReviewCardProps> = (props) => {
	const { review, photoUrl } = useReviewCard(props);

	return (
		<div className="w-[300px] sm:w-[375px] h-[275px] sm:h-[325px] rounded-lg border-2 sm:border-[3px] border-solid border-black px-4 sm:px-[35px] py-3 sm:py-[18px] flex flex-col justify-between">
			<Typography
				variant="p"
				className="text-[14px] sm:text-[17px] overflow-hidden line-clamp-6 sm:line-clamp-7 [display:-webkit-box] [-webkit-line-clamp:6] sm:[-webkit-line-clamp:7] [-webkit-box-orient:vertical]"
			>{`"${review.text}"`}</Typography>
			<div className="flex gap-2 sm:gap-3 mt-2">
				{photoUrl && !photoUrl.includes('profilePhotoFiller') && !photoUrl.includes('defaultReviewer') && (
					<div className="bg-gray-200 p-1 rounded-xl h-fit aspect-square flex-shrink-0">
						<Image
							src={photoUrl}
							alt="Reviewer Photo"
							width={32}
							height={32}
							className="rounded-full"
						/>
					</div>
				)}
				<div className="flex flex-col justify-center min-w-0">
					<Typography variant="p" className="text-[14px] sm:text-[17px] font-semibold truncate">
						{review.fullName}
					</Typography>
					<Typography
						variant="muted"
						className="text-[12px] sm:text-[15px] text-gray-500 truncate"
					>
						{review.company}
					</Typography>
				</div>
			</div>
		</div>
	);
};
