import {
	TooltipProvider,
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';
import { FC } from 'react';

interface InfoTooltipProps {
	message?: string;
}
const InfoTooltip: FC<InfoTooltipProps> = ({ message }) => {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<InfoIcon className="h-4 w-4 text-light-foreground" />
				</TooltipTrigger>
				<TooltipContent className="max-w-[200px]">
					<p>{message}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};

export default InfoTooltip;
