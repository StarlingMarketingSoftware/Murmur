import { TypographyMuted } from '@/components/ui/typography';
import { FC, ReactNode } from 'react';

interface MutedSubtextProps {
	children?: ReactNode;
}

const MutedSubtext: FC<MutedSubtextProps> = ({ children }) => {
	return <TypographyMuted className="text-center my-5">{children}</TypographyMuted>;
};

export default MutedSubtext;
