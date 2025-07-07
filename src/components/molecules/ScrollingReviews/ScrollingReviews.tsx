import { useEffect, useRef } from 'react';
import { ReviewCard } from '../ReviewCard/ReviewCard';
import { Review } from '@/types';
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from '@/components/ui/carousel';

const REVIEWS: Review[] = [
	{
		text: 'When I was at Columbia founding Lotreck Music, a tool like Murmur would have been an absolute game changer!',
		fullName: 'Robert Lotreck',
		company: 'Lotreck Music LLC',
		photoUrl: '/photos/jeremyAvatar.jpg',
	},
	{
		text: 'Talking to new folks is one of the biggest challenges to overcome as a small business owner. When my husband and I started using Murmur to help us book more events for our catering business, it brought us our busiest month to date!',
		fullName: 'Julia Bennett',
		company: 'Wilmington Catering',
		photoUrl: '/photos/jeremyAvatar.jpg',
	},
	{
		text: `It's nuts! So we use a bunch of AI related tools. We've even used tools that automate parts of email sending process. Starling's Murmur does this with a lot of precision and a lot of detail.`,
		fullName: 'Jeremy Ben-Meir',
		company: 'PointOne Technologies',
		photoUrl: '/photos/jeremyAvatar.jpg',
	},
	{
		text: `I was able to get done in a day what it took weeks to do in the past! It used to be a chore to get our emails out. We've alleviated a significant time constraint.`,
		fullName: 'Jack Carter',
		company: 'Radiance Pharmaceuticals',
		photoUrl: '/photos/jeremyAvatar.jpg',
	},
	{
		text: `After exhausting every marketing tool on the market, we found Murmur delivers exactly what we needed. The team is intelligent and responsive.`,
		fullName: 'Suki Lee',
		company: 'Nexora Solutions',
		photoUrl: '/photos/jeremyAvatar.jpg',
	},
];

export const ScrollingReviews = () => {
	const scrollerRef = useRef<HTMLDivElement>(null);
	const scrollerInnerRef = useRef<HTMLDivElement>(null);

	return (
		<>
			<Carousel className="sm:hidden block w-7/10 mx-auto">
				<CarouselContent>
					{REVIEWS.map((review, index) => (
						<CarouselItem key={index} className="w-full mx-auto">
							<div key={index} className="flex justify-center">
								<ReviewCard review={review} />
							</div>
						</CarouselItem>
					))}
				</CarouselContent>
				<CarouselPrevious />
				<CarouselNext />
			</Carousel>
			<div
				ref={scrollerRef}
				className="w-full pt-17 pb-11 overflow-hidden sm:block hidden"
				style={{
					maskImage:
						'linear-gradient(to right, transparent, white 20%, white 80%, transparent 100%)',
					WebkitMaskImage:
						'linear-gradient(to right, transparent, white 20%, white 80%, transparent 100%)',
				}}
			>
				<div
					ref={scrollerInnerRef}
					className="animate-scroll hover:animate-none w-fit flex gap-22 py-2"
				>
					{REVIEWS.map((review, index) => (
						<div key={index}>
							<ReviewCard review={review} />
						</div>
					))}
					{REVIEWS.map((review, index) => (
						<div className="" key={index}>
							<ReviewCard review={review} />
						</div>
					))}
				</div>
			</div>
		</>
	);
};
