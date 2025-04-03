import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
	className?: string;
	size?: 'small' | 'medium' | 'large' | 'xl' | number;
}

export function Spinner({ className, size = 'xl' }: SpinnerProps) {
	const sizeValue = (): number => {
		if (typeof size === 'number') {
			return size;
		}

		switch (size) {
			case 'small':
				return 16;
			case 'medium':
				return 24;
			case 'large':
				return 32;
			case 'xl':
			default:
				return 48;
		}
	};

	return (
		<Loader2
			size={sizeValue()}
			className={cn('animate-spin text-muted-foreground mx-auto', className)}
		/>
	);
}

export default Spinner;
