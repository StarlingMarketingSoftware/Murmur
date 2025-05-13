import { Button } from '@/components/ui/button';
import { urls } from '@/constants/urls';
import {
	TooltipProvider,
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from '@/components/ui/tooltip';
import { LockIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FC, MouseEvent } from 'react';

interface FeatureLockedButtonProps {
	message?: string;
}
const FeatureLockedButton: FC<FeatureLockedButtonProps> = ({
	message = 'Please upgrade your subscription to use this feature.',
}) => {
	const router = useRouter();

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						onClick={(e: MouseEvent) => {
							e.stopPropagation();
							router.push(urls.pricing.index);
						}}
						variant="ghost"
					>
						<LockIcon className="h-4 w-4 text-muted-foreground" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="max-w-[200px]">
					<p>{message}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};

export default FeatureLockedButton;
