import { FC } from 'react';
import { FaqSectionProps, useFaqSection } from './useFaqSection';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
export const FaqSection: FC<FaqSectionProps> = (props) => {
	const { faqs, header, title, description, showMoreLink } = useFaqSection(props);

	return (
		<div className="mt-38 w-full max-w-[1112px] mx-auto py-12 md:py-16 p-5 sm:px-8 md:px-16">
			<Typography variant="h3" font="secondary" className="text-4 p-0 text-white">
				{header}
			</Typography>
			<Typography variant="h2" font="secondary" className="text-[36px] font-bold mt-3 text-white">
				{title}
			</Typography>
			<Typography
				variant="p"
				font="secondary"
				className="text-[18px] !mt-[20px] text-white/80"
			>
				{description}
			</Typography>
			<Accordion type="single" collapsible className="w-full mt-16" defaultValue="item-1">
				{faqs.map((faq, index) => (
					<AccordionItem key={index} value={`item-${index}`} className="border-b border-white/20">
						<AccordionTrigger className="text-white [&>svg]:text-white">
							<Typography
								variant="h4"
								font="secondary"
								className="text-[20px] font-semibold text-white"
							>
								{faq.question}
							</Typography>
						</AccordionTrigger>
						<AccordionContent className="flex flex-col gap-4 text-balance my-5 md:my-15">
							<Typography font="secondary" className="!text-[16px] text-white/80">
								{faq.answer}
							</Typography>
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
			{showMoreLink && (
				<div className="flex justify-center mt-16">
					<Link href={`${showMoreLink}#faq-section`}>
						<Button
							variant="light"
							size="lg"
							className="border-2 border-white font-secondary text-white rounded-none text-[16px] py-0 px-6 h-12 hover:bg-white hover:text-[#2B2B2B] bg-transparent"
						>
							Show More FAQs
						</Button>
					</Link>
				</div>
			)}
		</div>
	);
};
