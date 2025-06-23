import { FC, ReactNode } from 'react';

interface AuthPageLayoutProps {
	children: ReactNode;
}

export const AuthPageLayout: FC<AuthPageLayoutProps> = ({ children }) => {
	return (
		<div className="flex items-center justify-center min-h-screen ">
			<div className="w-full max-w-md p-8 space-y-8 rounded-lg">{children}</div>
		</div>
	);
};
