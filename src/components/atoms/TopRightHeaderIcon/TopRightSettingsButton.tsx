'use client';

import SettingsGearIcon from '@/components/atoms/_svg/SettingsGearIcon';
import { getTopRightSettingsButtonClassName } from './topRightHeaderIconStyles';

type TopRightSettingsButtonProps = {
	isOpen: boolean;
	onClick: () => void;
};

export function TopRightSettingsButton({ isOpen, onClick }: TopRightSettingsButtonProps) {
	return (
		<button
			type="button"
			aria-label="Settings"
			aria-expanded={isOpen}
			onClick={onClick}
			className={getTopRightSettingsButtonClassName(isOpen)}
		>
			<SettingsGearIcon width={20} height={20} />
		</button>
	);
}
