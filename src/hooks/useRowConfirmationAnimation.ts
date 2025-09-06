import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';

interface UseRowConfirmationAnimationProps {
	confirmingCampaignId: number | null;
	setCountdown: (value: number | ((prev: number) => number)) => void;
}

export const useRowConfirmationAnimation = ({
	confirmingCampaignId,
	setCountdown,
}: UseRowConfirmationAnimationProps) => {
	const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const gradientAnimationRef = useRef<gsap.core.Timeline | gsap.core.Tween | null>(null);

	// Clean up all row styles
	const clearAllRowStyles = useCallback(() => {
		const allRows = document.querySelectorAll('[data-campaign-id]');
		allRows.forEach((row) => {
			const r = row as HTMLElement;
			r.style.removeProperty('background');
			r.style.removeProperty('background-color');
			r.style.removeProperty('background-image');
			r.style.removeProperty('background-size');
			r.style.removeProperty('background-position');
			r.style.removeProperty('will-change');
			r.style.removeProperty('border-color');
			r.style.removeProperty('transform');
			r.style.removeProperty('transition');
			r.style.removeProperty('transform-origin');
			r.style.removeProperty('box-shadow');
			r.style.removeProperty('filter');
			r.style.removeProperty('cursor');

			// Reset cells
			const cells = row.querySelectorAll('td');
			cells.forEach((cell) => {
				const c = cell as HTMLElement;
				c.style.removeProperty('background');
				c.style.removeProperty('background-color');
				c.style.removeProperty('background-image');
				c.style.removeProperty('background-size');
				c.style.removeProperty('background-position');
				c.style.removeProperty('border-color');
			});
		});
	}, []);

	// Set up the confirming row styles and animation
	const setupConfirmingRowAnimation = useCallback(
		(rowElement: HTMLElement) => {
			// Clear any previous inline animation styles from all rows
			clearAllRowStyles();

			// Kill previous animation if exists
			if (gradientAnimationRef.current) {
				gradientAnimationRef.current.kill();
			}

			// Make all cells transparent so the row background shows seamlessly
			const cells = rowElement.querySelectorAll('td');
			cells.forEach((cell) => {
				(cell as HTMLElement).style.setProperty('background', 'transparent', 'important');
				(cell as HTMLElement).style.setProperty(
					'background-color',
					'transparent',
					'important'
				);
				(cell as HTMLElement).style.removeProperty('background-image');
				(cell as HTMLElement).style.removeProperty('background-size');

				// Also make all child elements transparent
				const childDivs = cell.querySelectorAll('div');
				childDivs.forEach((div) => {
					(div as HTMLElement).style.setProperty(
						'background',
						'transparent',
						'important'
					);
					(div as HTMLElement).style.setProperty(
						'background-color',
						'transparent',
						'important'
					);
					(div as HTMLElement).style.setProperty('border-color', '#A20000', 'important');
				});
			});

			// Set up multi-layer cyber wave with parallax speeds and neon glow
			rowElement.style.setProperty(
				'background-image',
				// Fast-moving foreground wave (sharp cyber lines)
				'linear-gradient(90deg, transparent 0%, rgba(200, 0, 0, 0.4) 10%, rgba(180, 0, 0, 0.7) 20%, rgba(150, 0, 0, 0.9) 30%, rgba(180, 0, 0, 0.7) 40%, rgba(200, 0, 0, 0.4) 50%, transparent 60%), ' +
					// Medium-speed midground wave (deeper red pulses)
					'linear-gradient(95deg, transparent 0%, rgba(140, 0, 0, 0.5) 15%, rgba(120, 0, 0, 0.8) 30%, rgba(100, 0, 0, 0.9) 45%, rgba(120, 0, 0, 0.8) 60%, rgba(140, 0, 0, 0.5) 75%, transparent 90%), ' +
					// Slow background wave (subtle depth)
					'linear-gradient(100deg, transparent 0%, rgba(160, 0, 0, 0.3) 20%, rgba(130, 0, 0, 0.6) 40%, rgba(110, 0, 0, 0.8) 60%, rgba(130, 0, 0, 0.6) 80%, rgba(160, 0, 0, 0.3) 100%), ' +
					// Base gradient for solid red foundation
					'linear-gradient(0deg, #B00000, #900000)',
				'important'
			);
			rowElement.style.setProperty(
				'background-size',
				'300% 100%, 400% 100%, 500% 100%, 100% 100%', // Different sizes for parallax effect
				'important'
			);
			rowElement.style.setProperty(
				'background-position',
				'0% 0%, 0% 0%, 0% 0%, 0% 0%',
				'important'
			);
			rowElement.style.setProperty('background-color', '#A00000', 'important');
			rowElement.style.setProperty('border-color', '#A00000', 'important');
			rowElement.style.setProperty(
				'will-change',
				'background-position, filter',
				'important'
			);
			rowElement.style.setProperty('cursor', 'pointer', 'important');

			// Set initial filter (no shadow)
			gsap.set(rowElement, {
				filter: 'brightness(1) contrast(1)',
			});

			// Create timeline for continuous, infinite animation
			gradientAnimationRef.current = gsap
				.timeline({ repeat: -1, defaults: { ease: 'none' } })
				.to(
					rowElement,
					{
						backgroundPosition: '-300% 0%, -400% 0%, -500% 0%, 0% 0%',
						duration: 4, // Overall cycle time for continuous flow
					},
					0
				)
				.to(
					rowElement,
					{
						filter: 'brightness(1.2) contrast(1.1)', // Subtle brightness pulse for energy
						duration: 1.5,
						repeat: -1,
						yoyo: true,
						ease: 'sine.inOut',
					},
					0
				);
		},
		[clearAllRowStyles]
	);

	// Start countdown interval
	const startCountdown = useCallback(() => {
		if (countdownIntervalRef.current) {
			clearInterval(countdownIntervalRef.current);
		}
		countdownIntervalRef.current = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					return 1;
				}
				return prev - 1;
			});
		}, 1000);
	}, [setCountdown]);

	// Stop countdown and animation
	const stopAnimation = useCallback(() => {
		if (countdownIntervalRef.current) {
			clearInterval(countdownIntervalRef.current);
			countdownIntervalRef.current = null;
		}
		if (gradientAnimationRef.current) {
			gradientAnimationRef.current.kill();
			gradientAnimationRef.current = null;
		}
		clearAllRowStyles();
	}, [clearAllRowStyles]);

	// Main effect for handling animation state changes
	useEffect(() => {
		if (confirmingCampaignId !== null) {
			// Reset countdown
			setCountdown(5);

			// Start countdown interval
			startCountdown();

			// Use setTimeout to ensure DOM is updated
			setTimeout(() => {
				const rowElement = document.querySelector(
					`[data-campaign-id="${confirmingCampaignId}"]`
				);

				if (rowElement) {
					setupConfirmingRowAnimation(rowElement as HTMLElement);
				}
			}, 0);
		} else {
			stopAnimation();
		}
	}, [
		confirmingCampaignId,
		setCountdown,
		startCountdown,
		setupConfirmingRowAnimation,
		stopAnimation,
	]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopAnimation();
		};
	}, [stopAnimation]);

	return {
		stopAnimation,
		clearAllRowStyles,
	};
};
