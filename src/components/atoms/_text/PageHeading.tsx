import { Typography } from '@/components/ui/typography';
import { FC, ReactNode } from 'react';

interface PageHeadingProps {
	children?: ReactNode;
}

const PageHeading: FC<PageHeadingProps> = ({ children }) => {
	return (
		<Typography variant="h1" className="text-center my-8">
			{children}
		</Typography>
	);
};

export default PageHeading;
