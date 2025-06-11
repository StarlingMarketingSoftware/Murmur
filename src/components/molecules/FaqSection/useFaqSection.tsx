import { FAQ } from '@/types';

export interface FaqSectionProps {
	faqs: FAQ[];
	header: string;
	title: string;
	description: string;
}

export const useFaqSection = (props: FaqSectionProps) => {
	const { faqs } = props;

	return {
		faqs,
	};
};
