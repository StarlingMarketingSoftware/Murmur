import { Typography } from '@/components/ui/typography';
import { useIsMobile } from '@/hooks/useIsMobile';

export const NoMobilePage = () => {
	const isMobile = useIsMobile();

	if (isMobile === null || !isMobile) {
		return null;
	}

	return (
		<div className="flex-col items-center justify-center h-screen w-screen flex fixed top-0 left-0 z-40 bg-background px-4 text-center">
			<div className="flex flex-col items-center justify-center">
				<Typography variant="h1">The mobile app is coming soon.</Typography>
				<Typography variant="p" color="light" className="mt-6">
					For now, please use a larger screen.
				</Typography>
			</div>
		</div>
	);
};
