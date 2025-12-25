import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
	return (
		<SonnerToaster
			gap={10}
			duration={3500}
			closeButton
			position="bottom-right"
			icons={{
				success: null,
				error: null,
				warning: null,
				info: null,
				loading: null,
			}}
			toastOptions={{
				duration: 3000,
				className: '!shadow-none',
				style: {
					background: '#FFFFFF',
					border: '3px solid #000000',
					borderRadius: '8px',
					paddingRight: '36px',
				},
			}}
		/>
	);
}
