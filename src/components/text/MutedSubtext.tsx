import { FC, ReactNode } from 'react';
import { TypographyMuted } from '../ui/typography';

interface MutedSubtextProps {
	children?: ReactNode;
}

const MutedSubtext: FC<MutedSubtextProps> = ({ children }) => {
	return <TypographyMuted className="text-center my-5">{children}</TypographyMuted>;
};

export default MutedSubtext;
