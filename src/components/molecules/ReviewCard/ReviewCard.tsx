import { FC } from 'react';
import { ReviewCardProps, useReviewCard } from './useReviewCard';
import { Typography } from '@/components/ui/typography';
import Image from 'next/image';

export const ReviewCard: FC<ReviewCardProps> = (props) => {
	const { review, photoUrl } = useReviewCard(props);

	return (
		<div className="w-full sm:w-[375px] h-[275px] sm:h-[325px] rounded-lg border-2 sm:border-[3px] border-solid border-black px-4 sm:px-[35px] py-3 sm:py-[18px]">
			<Typography
				variant="p"
				className="text-[15px] sm:text-[17px] h-75/100"
			>{`"${review.text}"`}</Typography>
			<div className="flex gap-2 sm:gap-3">
				<div className="bg-gray-200 p-1 rounded-xl h-[36px] h-fit aspect-square">
					<Image
						src={photoUrl}
						alt="Reviewer Photo"
						width={32}
						height={32}
						className="rounded-full"
					/>
				</div>
				<div className="flex flex-col justify-center">
					<Typography variant="p" className="text-[15px] sm:text-[17px] font-semibold">
						{review.fullName}
					</Typography>
					<Typography
						variant="muted"
						className="text-[13px] sm:text-[15px] text-gray-500"
					>
						{review.company}
					</Typography>
				</div>
			</div>
		</div>
	);
};
