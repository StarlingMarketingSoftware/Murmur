import { ReactNode } from 'react';

export interface AppLayoutProps {
	paddingTop?: 'none' | 'small' | 'medium' | 'large';
	children: ReactNode;
}

export const useAppLayout = (props: AppLayoutProps) => {
	return {
		...props,
	};
};
