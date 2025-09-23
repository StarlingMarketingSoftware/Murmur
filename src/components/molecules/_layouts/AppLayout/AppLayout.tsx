import { FC } from 'react';
import { AppLayoutProps, useAppLayout } from './useAppLayout';
import { cn } from '@/utils';

export const AppLayout: FC<AppLayoutProps> = (props) => {
	const { paddingTop } = props;

	const cnPadding = [];

	switch (paddingTop) {
		case 'none':
			cnPadding.push('pt-0');
			break;
		case 'small':
			cnPadding.push('pt-2');
			break;
		case 'medium':
			cnPadding.push('pt-4');
			break;
		case 'large':
			cnPadding.push('pt-8');
			break;
		default:
			cnPadding.push('pt-4');
	}
	const { children } = useAppLayout(props);
	return (
		<div
			className={cn(
				'max-w-[1250px] min-h-[115vh] w-9/10 mx-auto lg:w-9/10 mb-10',
				cnPadding
			)}
		>
			{children}
		</div>
	);
};
