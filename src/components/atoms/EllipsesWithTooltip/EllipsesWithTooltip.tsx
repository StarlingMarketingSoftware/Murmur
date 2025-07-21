import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ellipsesText } from '@/utils/string';

interface EllipsesWithTooltipProps {
	text: string;
	maxLength?: number;
	className?: string;
	tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
}

export const EllipsesWithTooltip = ({
	text,
	maxLength = 50,
	className = '',
	tooltipPlacement = 'top',
}: EllipsesWithTooltipProps) => {
	if (!text) return null;

	const truncatedText = ellipsesText(text, maxLength);
	const needsTooltip = text.length > maxLength;

	if (!needsTooltip) {
		return <span className={className}>{text}</span>;
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className={`cursor-help ${className}`}>{truncatedText}</span>
			</TooltipTrigger>
			<TooltipContent side={tooltipPlacement} className="max-w-md break-words">
				<p>{text}</p>
			</TooltipContent>
		</Tooltip>
	);
};
