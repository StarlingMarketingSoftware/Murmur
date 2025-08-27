'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/utils';

interface FeatureNavProps {
	sections: {
		id: string;
		label: string;
		number: string;
	}[];
	className?: string;
}

export function FeatureNav({ sections, className }: FeatureNavProps) {
	const [activeSection, setActiveSection] = useState<string>('');

	useEffect(() => {
		const handleScroll = () => {
			const scrollPosition = window.scrollY + window.innerHeight / 2;

			for (const section of sections) {
				const element = document.getElementById(section.id);
				if (element) {
					const { top, bottom } = element.getBoundingClientRect();
					const elementTop = window.scrollY + top;
					const elementBottom = window.scrollY + bottom;

					if (scrollPosition >= elementTop && scrollPosition <= elementBottom) {
						setActiveSection(section.id);
						break;
					}
				}
			}
		};

		window.addEventListener('scroll', handleScroll);
		handleScroll(); // Check initial position

		return () => window.removeEventListener('scroll', handleScroll);
	}, [sections]);

	const handleClick = (id: string) => {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' });
		}
	};

	return (
		<nav className={cn('feature-nav', className)}>
			{sections.map((section) => (
				<button
					key={section.id}
					onClick={() => handleClick(section.id)}
					className={cn('feature-nav-item', activeSection === section.id && 'active')}
					aria-label={section.label}
				>
					{section.number}
				</button>
			))}
		</nav>
	);
}
