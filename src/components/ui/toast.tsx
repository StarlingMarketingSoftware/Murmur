import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
	return (
		<SonnerToaster
			richColors
			gap={10}
			duration={3500}
			closeButton
			position="bottom-right"
			toastOptions={{
				duration: 4500,
				className: '!shadow-none border-1  border-solid border-primary',
			}}
		/>
	);
}
