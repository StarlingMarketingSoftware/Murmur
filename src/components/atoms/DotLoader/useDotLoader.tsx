import { GOLDEN_RATIO, INVERSE_GOLDEN } from '@/constants';

export interface DotLoaderProps {
	className?: string;
	size?: 'small' | 'medium' | 'large' | 'xl' | number;
	color?: 'light' | 'foreground' | 'background';
}

export const useDotLoader = (props: DotLoaderProps) => {
	const { size = 'xl', color = 'light', className } = props;

	const getBaseSize = (): number => {
		if (typeof size === 'number') return size;

		switch (size) {
			case 'small':
				return 3;
			case 'medium':
				return 4;
			case 'large':
				return 5;
			case 'xl':
			default:
				return 6;
		}
	};

	const baseSize = getBaseSize();

	const dotSizes = [
		baseSize * INVERSE_GOLDEN * INVERSE_GOLDEN, // Smallest
		baseSize * INVERSE_GOLDEN, // Medium
		baseSize, // Largest
	];

	const spacing = baseSize * GOLDEN_RATIO;

	const getColorClass = () => {
		switch (color) {
			case 'background':
				return 'bg-background';
			case 'light':
				return 'bg-gray-800';
			case 'foreground':
			default:
				return 'bg-black';
		}
	};

	const colorClass = getColorClass();

	return {
		spacing,
		dotSizes,
		colorClass,
		baseSize,
		className,
	};
};

export const useDotMorph = (props: DotLoaderProps) => {
	const { size = 'xl', color = 'light', className } = props;

	const getBaseSize = (): number => {
		if (typeof size === 'number') return size;

		switch (size) {
			case 'small':
				return 3;
			case 'medium':
				return 4;
			case 'large':
				return 5;
			case 'xl':
			default:
				return 6;
		}
	};

	const baseSize = getBaseSize();
	const dotSizes = [baseSize * 0.5, baseSize * 0.8, baseSize];
	const spacing = baseSize * 1.2;

	const getColorClass = () => {
		switch (color) {
			case 'background':
				return 'bg-background';
			case 'foreground':
				return 'bg-gray-700';
			case 'light':
			default:
				return 'bg-gray-900';
		}
	};

	const colorClass = getColorClass();

	return {
		className,
		spacing,
		dotSizes,
		colorClass,
	};
};

export const useDotPulse = (props: DotLoaderProps) => {
	const { size = 'xl', color = 'light', className } = props;

	const getBaseSize = (): number => {
		if (typeof size === 'number') return size;

		switch (size) {
			case 'small':
				return 4;
			case 'medium':
				return 5;
			case 'large':
				return 6;
			case 'xl':
			default:
				return 8;
		}
	};

	const baseSize = getBaseSize();
	const dotSizes = [Math.round(baseSize * 0.5), Math.round(baseSize * 0.75), baseSize];
	const spacing = baseSize * 0.8;

	const getColor = () => {
		switch (color) {
			case 'background':
				return '#ffffff';
			case 'foreground':
				return '#374151';
			case 'light':
			default:
				return '#111827';
		}
	};

	const dotColor = getColor();

	return {
		spacing,
		dotSizes,
		dotColor,
		className,
	};
};
