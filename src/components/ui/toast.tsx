'use client';

import CloseButtonIcon from '@/components/atoms/_svg/CloseButtonIcon';
import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
	return (
		<SonnerToaster
			richColors
			gap={10}
			duration={2000}
			closeButton
			position="bottom-right"
			expand={false}
			visibleToasts={1}
			icons={{
				close: <CloseButtonIcon width={14} height={14} />,
			}}
			toastOptions={{
				duration: 2000,	
				classNames: {
					icon: 'hidden',
					toast: 'group relative',
					closeButton:
						'!left-auto !right-4 !top-1/2 !-translate-y-1/2 !translate-x-0 !transform !border-0 !bg-transparent !p-0 !h-4 !w-4 !rounded-none !text-inherit',
				},
				style: {
					boxShadow: 'none',
					borderRadius: 8,
					border: '3px solid #000000',
					filter: 'none',
					paddingRight: 48,
					minHeight: 48,
					height: 'auto',
				},
			}}
		/>
	);
}
