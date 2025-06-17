'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';

export function DarkModeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	const isDark = theme === 'dark';

	const handleToggle = (checked: boolean) => {
		setTheme(checked ? 'dark' : 'light');
	};

	return (
		<div className="flex items-center gap-2">
			<Sun
				className="h-[1.2rem] w-[1.2rem] transition-all duration-300 dark:opacity-50"
				color="white"
			/>
			<Switch
				checked={isDark}
				onCheckedChange={handleToggle}
				aria-label="Toggle dark mode"
			/>
			<Moon
				className="h-[1.2rem] w-[1.2rem] transition-all duration-300 dark:opacity-100 opacity-50"
				color="white"
			/>
		</div>
	);
}
