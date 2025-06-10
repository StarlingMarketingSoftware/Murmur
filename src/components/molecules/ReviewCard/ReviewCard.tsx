import { FC } from 'react';
import { ReviewCardProps, useReviewCard } from './useReviewCard';
import { TypographyMuted, TypographyP } from '@/components/ui/typography';
import Image from 'next/image';

export const ReviewCard: FC<ReviewCardProps> = (props) => {
	const { review, photoUrl } = useReviewCard(props);

	return (
		<div className="w-[375px] h-[325px] rounded-lg border-[3px] border-solid border-black px-[35px] py-[18px]">
			<TypographyP className="text-[17px] h-75/100">{`"${review.text}"`}</TypographyP>
			<div className="flex gap-3">
				<div className="bg-gray-200 p-1 rounded-xl h-[44px] aspect-square">
					<Image
						src={photoUrl}
						alt="Reviewer Photo"
						width={37}
						height={37}
						className="rounded-full"
					/>
				</div>
				<div className="flex flex-col justify-center">
					<TypographyP className="text-[17px] font-semibold">
						{review.fullName}
					</TypographyP>
					<TypographyMuted className="text-[15px] text-gray-500">
						{review.company}
					</TypographyMuted>
				</div>
			</div>
		</div>
	);
};
