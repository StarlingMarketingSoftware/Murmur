import { FAQ } from '@/types';

export interface FaqSectionProps {
	faqs: FAQ[];
	header: string;
	title: string;
	description: string;
	showMoreLink?: string;
	theme?: 'light' | 'dark';
}

export const useFaqSection = (props: FaqSectionProps) => {
	const { faqs, header, title, description, showMoreLink, theme = 'dark' } = props;

	return {
		faqs,
		header,
		title,
		description,
		showMoreLink,
		theme,
	};
};
