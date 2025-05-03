import { Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface SpinnerProps {
	className?: string;
	size?: 'small' | 'medium' | 'large' | 'xl' | number;
	color?: 'foreground' | 'background';
}

export function Spinner({ className, size = 'xl', color = 'foreground' }: SpinnerProps) {
	const cn = [className, 'animate-spin mx-auto'];
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

	switch (color) {
		case 'foreground':
			cn.push('text-foreground');
			break;
		case 'background':
			cn.push('text-b');
	}

	return <Loader2 size={sizeValue()} className={twMerge(cn)} />;
}

export default Spinner;
