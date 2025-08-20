export interface SpinnerProps {
	className?: string;
	size?: 'small' | 'medium' | 'large' | 'xl' | number;
	color?: 'foreground' | 'background' | 'light';
}

export const useSpinner = (props: SpinnerProps) => {
	const { className, size = 'xl', color = 'light' } = props;

	const getBaseSize = (): number => {
		if (typeof size === 'number') {
			if (size <= 16) return 4;
			if (size <= 24) return 5;
			if (size <= 32) return 6;
			return 8;
		}

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

	const dotSizes = [
		Math.max(3, Math.round(baseSize * 0.6)),
		Math.max(4, Math.round(baseSize * 0.8)),
		Math.max(5, baseSize),
	];

	const spacing = Math.max(3, baseSize * 0.5);

	const getColor = () => {
		switch (color) {
			case 'background':
				return '#ffffff';
			case 'foreground':
				return '#1d1d1f';
			case 'light':
			default:
				return '#1d1d1f';
		}
	};

	const dotColor = getColor();

	const containerSize = (() => {
		if (typeof size === 'number') return size;
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
	})();

	return {
		dotSizes,
		spacing,
		dotColor,
		containerSize,
		className,
	};
};
