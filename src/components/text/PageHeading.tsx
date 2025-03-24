import { FC, ReactNode } from 'react';
import { TypographyH1 } from '../ui/typography';

interface PageHeadingProps {
	children?: ReactNode;
}

const PageHeading: FC<PageHeadingProps> = ({ children }) => {
	return <TypographyH1 className="text-center my-8">{children}</TypographyH1>;
};

export default PageHeading;
