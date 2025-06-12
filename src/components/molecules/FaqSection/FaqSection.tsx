import { FC } from 'react';
import { FaqSectionProps, useFaqSection } from './useFaqSection';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Typography } from '@/components/ui/typography';
export const FaqSection: FC<FaqSectionProps> = (props) => {
	const { faqs, header, title, description } = useFaqSection(props);

	return (
		<div className="mt-38 w-[1112px] mx-auto p-16 bg-muted">
			<Typography variant="h3" font="secondary" className="text-4 p-0">
				{header}
			</Typography>
			<Typography variant="h2" font="secondary" className="text-[36px] font-bold mt-3">
				{title}
			</Typography>
			<Typography
				color="muted"
				variant="p"
				font="secondary"
				className="text-[18px] !mt-[20px]"
			>
				{description}
			</Typography>
			<Accordion type="single" collapsible className="w-full mt-16" defaultValue="item-1">
				{faqs.map((faq, index) => (
					<AccordionItem key={index} value={`item-${index}`}>
						<AccordionTrigger>
							<Typography
								variant="h4"
								font="secondary"
								className="text-[20px] font-semibold"
							>
								{faq.question}
							</Typography>
						</AccordionTrigger>
						<AccordionContent className="flex flex-col gap-4 text-balance my-15">
							<Typography font="secondary" className="text-[16px]" color="muted">
								{faq.answer}
							</Typography>
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	);
};
