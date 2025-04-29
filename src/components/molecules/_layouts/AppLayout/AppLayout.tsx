import { FC } from 'react';
import { AppLayoutProps, useAppLayout } from './useAppLayout';

export const AppLayout: FC<AppLayoutProps> = (props) => {
	const { children } = useAppLayout(props);
	return <div className="max-w-[1250px] w-95/100 mx-auto lg:w-9/10">{children}</div>;
};
