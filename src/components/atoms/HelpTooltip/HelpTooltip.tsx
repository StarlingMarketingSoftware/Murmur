import { FC } from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HelpTooltipProps {
	content: string;
	className?: string;
	iconClassName?: string;
}

export const HelpTooltip: FC<HelpTooltipProps> = ({
	content,
	className,
	iconClassName,
}) => {
	return (
		<Tooltip>
			<TooltipTrigger className={className}>
				<HelpCircle
					onClick={(e) => e.stopPropagation()}
					className={`h-4 w-4 text-muted-foreground hover:text-foreground transition-colors ${iconClassName}`}
				/>
			</TooltipTrigger>
			<TooltipContent>{content}</TooltipContent>
		</Tooltip>
	);
};
