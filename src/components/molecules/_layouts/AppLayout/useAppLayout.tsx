import { ReactNode } from 'react';

export interface AppLayoutProps {
	children: ReactNode;
}

export const useAppLayout = (props: AppLayoutProps) => {
	return {
		...props,
	};
};
