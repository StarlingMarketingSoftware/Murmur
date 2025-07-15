import { Typography } from '@/components/ui/typography';

export const NoMobilePage = () => {
	return (
		<div className="flex-col items-center justify-center h-screen w-screen flex lg:hidden fixed top-0 left-0 z-40 bg-background px-4 text-center">
			<div className="flex flex-col items-center justify-center">
				<Typography variant="h1">The mobile app is coming soon.</Typography>
				<Typography variant="p" color="light" className="mt-6">
					For now, please use a larger screen.
				</Typography>
			</div>
		</div>
	);
};
