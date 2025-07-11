import { FC } from 'react';
import { AppLayoutProps, useAppLayout } from './useAppLayout';
import { twMerge } from 'tailwind-merge';

export const AppLayout: FC<AppLayoutProps> = (props) => {
	const { paddingTop } = props;

	const cn = [];

	switch (paddingTop) {
		case 'none':
			cn.push('pt-0');
			break;
		case 'small':
			cn.push('pt-2');
			break;
		case 'medium':
			cn.push('pt-4');
			break;
		case 'large':
			cn.push('pt-8');
			break;
		default:
			cn.push('pt-4');
	}
	const { children } = useAppLayout(props);
	return (
		<div
			className={twMerge(
				'max-w-[1250px] min-h-[115vh] w-9/10 mx-auto lg:w-9/10 mb-50',
				cn
			)}
		>
			{children}
		</div>
	);
};
