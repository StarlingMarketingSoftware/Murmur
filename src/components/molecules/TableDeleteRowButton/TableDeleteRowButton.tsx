import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { FC } from 'react';

interface TableDeleteRowButtonProps {
	onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
	isLoading?: boolean;
	disabled?: boolean;
}

const useTableDeleteRowButton = (props: TableDeleteRowButtonProps) => {
	return {
		...props,
	};
};

export const TableDeleteRowButton: FC<TableDeleteRowButtonProps> = (props) => {
	const { onClick, isLoading, disabled } = useTableDeleteRowButton(props);
	return (
		<Button
			variant="ghost"
			disabled={disabled}
			isLoading={isLoading}
			size="iconSm"
			onClick={async (e) => {
				e.stopPropagation();
				onClick(e);
			}}
		>
			<X className="text-destructive" />
		</Button>
	);
};
