import { Button } from '@/components/ui/button';
import { TrashIcon } from 'lucide-react';
import { FC } from 'react';

interface TableDeleteRowButtonProps {
	onClick: () => void;
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
			size="icon"
			onClick={async (e) => {
				e.stopPropagation();
				onClick();
			}}
		>
			<TrashIcon className="h-3 w-2 text-destructive" />
		</Button>
	);
};
