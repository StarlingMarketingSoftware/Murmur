import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
	className?: string;
	size?: number;
}

export function Spinner({ className, size = 50 }: SpinnerProps) {
	return (
		<Loader2
			size={size}
			className={cn('animate-spin text-muted-foreground mx-auto', className)}
		/>
	);
}

export default Spinner;
