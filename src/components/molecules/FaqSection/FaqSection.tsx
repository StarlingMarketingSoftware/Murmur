import { FC } from 'react';
import { FaqSectionProps, useFaqSection } from './useFaqSection';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
export const FaqSection: FC<FaqSectionProps> = (props) => {
	const { faqs, header, title, description } = useFaqSection(props);

	return (
		<div className="mt-38 w-[1112px] mx-auto p-16 bg-muted">
			<h2>{header}</h2>
			<h1>title</h1>
			<p>{description}</p>
			<Accordion type="single" collapsible className="w-full" defaultValue="item-1">
				{faqs.map((faq, index) => (
					<AccordionItem key={index} value={`item-${index}`}>
						<AccordionTrigger>{faq.question}</AccordionTrigger>
						<AccordionContent className="flex flex-col gap-4 text-balance">
							<p>{faq.answer}</p>
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	);
};
