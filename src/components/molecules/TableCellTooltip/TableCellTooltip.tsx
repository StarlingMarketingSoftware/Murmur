import { EllipsesWithTooltip } from '@/components/atoms/EllipsesWithTooltip/EllipsesWithTooltip';
import { FC } from 'react';

interface TableCellTooltipProps {
	text: string;
	maxLength?: number;
}

export const TableCellTooltip: FC<TableCellTooltipProps> = ({ text, maxLength = 40 }) => {
	return (
		<div className="text-left transition-all duration-200 ease-out">
			<EllipsesWithTooltip 
				tooltipPlacement="right" 
				text={text} 
				maxLength={maxLength} 
				tooltipDelay={200}
				className="transition-opacity duration-150"
			/>
		</div>
	);
};
