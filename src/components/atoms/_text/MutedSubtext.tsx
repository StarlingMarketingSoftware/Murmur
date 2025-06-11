import { Typography } from '@/components/ui/typography';
import { FC, ReactNode } from 'react';

interface MutedSubtextProps {
	children?: ReactNode;
}

const MutedSubtext: FC<MutedSubtextProps> = ({ children }) => {
	return (
		<Typography variant="muted" className="text-center my-5">
			{children}
		</Typography>
	);
};

export default MutedSubtext;
