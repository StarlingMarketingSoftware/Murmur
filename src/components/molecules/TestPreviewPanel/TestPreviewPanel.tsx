import { X } from 'lucide-react';
import {
	Dispatch,
	FC,
	SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { gsap } from 'gsap';
import { convertHtmlToPlainText } from '@/utils/html';

export interface TestPreviewPanelProps {
	setShowTestPreview: Dispatch<SetStateAction<boolean>>;
	testMessage: string;
	isLoading?: boolean;
}

export const TestPreviewPanel: FC<TestPreviewPanelProps> = ({
	setShowTestPreview,
	testMessage,
	isLoading = false,
}) => {
	const form = useFormContext();
	const contentRef = useRef<HTMLDivElement | null>(null);
	const overlayRef = useRef<HTMLDivElement | null>(null);
	const layer1Ref = useRef<HTMLDivElement | null>(null);
	const layer2Ref = useRef<HTMLDivElement | null>(null);
	const layer3Ref = useRef<HTMLDivElement | null>(null);
	const waveTweensRef = useRef<gsap.core.Tween[]>([]);
	const typingTimerRef = useRef<number | null>(null);
	const loadingTypingTimerRef = useRef<number | null>(null);
	const [typedSubject, setTypedSubject] = useState<string>('');
	const [typedBody, setTypedBody] = useState<string>('');
	const [loadingTyped, setLoadingTyped] = useState<string>('');

	const fontFamily = form.watch('font') || 'Arial';

	const { subjectTokens, bodyTokens } = useMemo(() => {
		if (!testMessage)
			return { subjectTokens: [] as string[], bodyTokens: [] as string[] };
		// We inject the subject followed by two <br> tags before the body.
		const doubleBreakRegex = /<br\s*\/?>(?:\s*|\n|\r)*<br\s*\/?>(?:\s*)/i;
		const match = testMessage.match(doubleBreakRegex);
		let subjectHtml = '';
		let bodyHtml = testMessage;
		if (match && typeof match.index === 'number') {
			subjectHtml = testMessage.slice(0, match.index);
			bodyHtml = testMessage.slice(match.index + match[0].length);
		}
		const subjectPlain = subjectHtml ? convertHtmlToPlainText(subjectHtml) : '';
		const bodyPlain = convertHtmlToPlainText(bodyHtml);
		return {
			subjectTokens: subjectPlain.split(/(\s+)/),
			bodyTokens: bodyPlain.split(/(\s+)/),
		};
	}, [testMessage]);

	// Multi-layer grayscale blobs with soft edges and top fade mask
	useEffect(() => {
		const overlay = overlayRef.current;
		if (!overlay) return;

		if (isLoading) {
			gsap.set(overlay, { opacity: 1, display: 'block' });
			// Clear existing tweens
			waveTweensRef.current.forEach((t) => t.kill());
			waveTweensRef.current = [];

			// Calculate a wrap distance in pixels for seamless looping
			const overlayWidth = overlay.getBoundingClientRect().width || window.innerWidth;
			const baseDistance = overlayWidth * 1.5;

			const layers: Array<{
				el: HTMLDivElement | null;
				duration: number;
				yDistance: number;
				yDuration: number;
				distanceMultiplier: number;
				delay: number;
				xPercentWobble: number;
			}> = [
				{
					el: layer1Ref.current,
					duration: 14,
					yDistance: 10,
					yDuration: 7,
					distanceMultiplier: 1,
					delay: 0,
					xPercentWobble: 2,
				},
				{
					el: layer2Ref.current,
					duration: 18,
					yDistance: 14,
					yDuration: 9,
					distanceMultiplier: 1.2,
					delay: 0.5,
					xPercentWobble: 3,
				},
				{
					el: layer3Ref.current,
					duration: 22,
					yDistance: 18,
					yDuration: 11,
					distanceMultiplier: 1.4,
					delay: 1,
					xPercentWobble: 4,
				},
			];

			layers.forEach(
				({
					el,
					duration,
					yDistance,
					yDuration,
					distanceMultiplier,
					delay,
					xPercentWobble,
				}) => {
					if (!el) return;
					const wrapDistance = baseDistance * distanceMultiplier;
					gsap.set(el, { x: 0, xPercent: 0, willChange: 'transform' });

					// Continuous horizontal drift with wrap to avoid abrupt jumps
					const tw1 = gsap.to(el, {
						x: `+=${wrapDistance}`,
						duration,
						ease: 'none',
						repeat: -1,
						delay,
						modifiers: {
							x: (x: string) => `${Math.abs(parseFloat(x)) % wrapDistance}px`,
						},
					});

					// Gentle vertical bobbing
					const tw2 = gsap.to(el, {
						y: `+=${yDistance}`,
						yoyo: true,
						repeat: -1,
						duration: yDuration,
						ease: 'sine.inOut',
						delay,
					});

					// Subtle horizontal wobble to feel like waves (additive via xPercent)
					const tw3b = gsap.to(el, {
						xPercent: `+=${xPercentWobble}`,
						yoyo: true,
						repeat: -1,
						duration: yDuration * 0.9,
						ease: 'sine.inOut',
						delay,
					});

					// Subtle scale breathing
					const tw3 = gsap.to(el, {
						scale: 1.02,
						yoyo: true,
						repeat: -1,
						duration: duration * 0.6,
						ease: 'sine.inOut',
						delay,
					});

					waveTweensRef.current.push(tw1, tw2, tw3b, tw3);
				}
			);
		} else {
			waveTweensRef.current.forEach((t) => t.kill());
			waveTweensRef.current = [];
		}
		return () => {
			waveTweensRef.current.forEach((t) => t.kill());
			waveTweensRef.current = [];
		};
	}, [isLoading]);

	// Typewriter effect after loading completes
	useEffect(() => {
		if (isLoading || (subjectTokens.length === 0 && bodyTokens.length === 0)) {
			setTypedSubject('');
			setTypedBody('');
			if (typingTimerRef.current) {
				window.clearInterval(typingTimerRef.current);
				typingTimerRef.current = null;
			}
			return;
		}
		setTypedSubject('');
		setTypedBody('');
		let phase: 'subject' | 'body' = subjectTokens.length > 0 ? 'subject' : 'body';
		let index = 0;
		if (typingTimerRef.current) {
			window.clearInterval(typingTimerRef.current);
		}

		typingTimerRef.current = window.setInterval(() => {
			if (phase === 'subject') {
				if (index < subjectTokens.length) {
					const token = subjectTokens[index];
					setTypedSubject((prev) => prev + token);
					index += 1;
				} else {
					phase = 'body';
					index = 0;
				}
			} else {
				if (index < bodyTokens.length) {
					const token = bodyTokens[index];
					setTypedBody((prev) => prev + token);
					index += 1;
				} else {
					if (typingTimerRef.current) {
						window.clearInterval(typingTimerRef.current);
						typingTimerRef.current = null;
					}
				}
			}
		}, 30);
		return () => {
			if (typingTimerRef.current) {
				window.clearInterval(typingTimerRef.current);
				typingTimerRef.current = null;
			}
		};
	}, [isLoading, subjectTokens, bodyTokens]);

	// Typewriter effect for loading overlay text: "Writing Test Email..."
	useEffect(() => {
		const LOADING_TEXT = 'Writing Test Email...';
		if (!isLoading) {
			setLoadingTyped('');
			if (loadingTypingTimerRef.current) {
				window.clearTimeout(loadingTypingTimerRef.current);
				loadingTypingTimerRef.current = null;
			}
			return;
		}

		let index = 0;
		function run() {
			setLoadingTyped(LOADING_TEXT.slice(0, index));
			index += 1;
			if (index <= LOADING_TEXT.length) {
				loadingTypingTimerRef.current = window.setTimeout(run, 65);
			} else {
				// Hold full text, then restart
				loadingTypingTimerRef.current = window.setTimeout(() => {
					index = 0;
					setLoadingTyped('');
					run();
				}, 900);
			}
		}
		run();
		return () => {
			if (loadingTypingTimerRef.current) {
				window.clearTimeout(loadingTypingTimerRef.current);
				loadingTypingTimerRef.current = null;
			}
		};
	}, [isLoading]);

	return (
		<div className="w-1/2 flex flex-col">
			<div className="flex-1 flex flex-col px-3 pt-3 pb-0">
				<div className="flex-1 border-2 border-black rounded-lg bg-background flex flex-col overflow-hidden mb-4 mt-[40px]">
					<div className="relative p-4">
						<Typography
							variant="h3"
							className="text-sm font-medium font-secondary text-center"
						>
							Test Prompt
						</Typography>
						<Button
							type="button"
							variant="icon"
							onClick={() => setShowTestPreview(false)}
							className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
						>
							<X className="h-5 w-5 text-destructive-dark" />
						</Button>
					</div>

					<div className="relative flex-1 bg-white" style={{ minHeight: '400px' }}>
						{/* Organic grayscale blob animation overlay */}
						{isLoading && (
							<div
								ref={overlayRef}
								className="absolute inset-0 pointer-events-none overflow-hidden"
								style={
									{
										// Removed mask gradient to prevent text cutoff
									}
								}
							>
								<div
									ref={layer1Ref}
									className="absolute inset-0"
									style={{
										filter: 'blur(10px)',
										willChange: 'transform',
										background: `
										radial-gradient(ellipse 70% 55% at 10% 40%, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0) 42%),
										radial-gradient(ellipse 80% 60% at 35% 70%, rgba(0,0,0,0.07) 0%, rgba(0,0,0,0) 48%),
										radial-gradient(ellipse 65% 50% at 75% 35%, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0) 45%)
									`,
										backgroundSize: '180% 100%',
										backgroundPosition: '0% 0%',
									}}
								/>
								<div
									ref={layer2Ref}
									className="absolute inset-0"
									style={{
										filter: 'blur(14px)',
										willChange: 'transform',
										background: `
										radial-gradient(ellipse 55% 45% at 20% 65%, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 40%),
										radial-gradient(ellipse 60% 50% at 55% 30%, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0) 44%),
										radial-gradient(ellipse 50% 40% at 85% 75%, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 38%)
									`,
										backgroundSize: '220% 100%',
										backgroundPosition: '-20% 0%',
									}}
								/>
								<div
									ref={layer3Ref}
									className="absolute inset-0"
									style={{
										filter: 'blur(18px)',
										opacity: 0.9,
										willChange: 'transform',
										background: `
										radial-gradient(ellipse 60% 50% at 15% 85%, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0) 36%),
										radial-gradient(ellipse 75% 55% at 65% 55%, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 42%),
										radial-gradient(ellipse 55% 45% at 92% 20%, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0) 34%)
									`,
										backgroundSize: '260% 100%',
										backgroundPosition: '-40% 0%',
									}}
								/>

								{/* Centered typewriter loading text */}
								<div className="absolute inset-0 flex items-center justify-center">
									<span className="font-inter text-[#737373] text-sm tracking-wide select-none">
										{loadingTyped}
									</span>
								</div>
							</div>
						)}

						{/* Typing content */}
						<div ref={contentRef} className="max-w-none text-[14px] relative z-20 p-6">
							<div
								className="whitespace-pre-wrap leading-[1.6] font-bold font-inter"
								style={{ fontFamily: 'Inter' }}
							>
								{typedSubject}
							</div>
							{typedSubject && (typedBody || bodyTokens.length > 0) && (
								<div className="h-3" />
							)}
							<div className="whitespace-pre-wrap leading-[1.6]" style={{ fontFamily }}>
								{typedBody}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
