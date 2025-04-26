import { TypographyH1 } from '@/components/ui/typography';
import { FC, ReactNode } from 'react';

interface PageHeadingProps {
	children?: ReactNode;
}

const PageHeading: FC<PageHeadingProps> = ({ children }) => {
	return <TypographyH1 className="text-center my-8">{children}</TypographyH1>;
};

export default PageHeading;
