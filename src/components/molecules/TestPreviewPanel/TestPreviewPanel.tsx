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
import { gsap } from 'gsap';
import { convertHtmlToPlainText } from '@/utils/html';
import { ContactWithName } from '@/types/contact';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { cn } from '@/utils';
import CloseButtonIcon from '@/components/atoms/_svg/CloseButtonIcon';

export interface TestPreviewPanelProps {
	setShowTestPreview: Dispatch<SetStateAction<boolean>>;
	testMessage: string;
	isLoading?: boolean;
	onTest?: () => void;
	isDisabled?: boolean;
	isTesting?: boolean;
	contact?: ContactWithName | null;
	className?: string;
	style?: React.CSSProperties;
}

export const TestPreviewPanel: FC<TestPreviewPanelProps> = ({
	setShowTestPreview,
	testMessage,
	isLoading = false,
	onTest,
	isDisabled,
	isTesting,
	contact,
	className,
	style,
}) => {
	const form = useFormContext();
	const contentRef = useRef<HTMLDivElement | null>(null);
	const overlayRef = useRef<HTMLDivElement | null>(null);
	const layer1Ref = useRef<HTMLDivElement | null>(null);
	const layer2Ref = useRef<HTMLDivElement | null>(null);
	const layer3Ref = useRef<HTMLDivElement | null>(null);
	const waveTweensRef = useRef<gsap.core.Tween[]>([]);
	const typingTimerRef = useRef<number | null>(null);
	const boxRef = useRef<HTMLDivElement | null>(null);
	const [typedSubject, setTypedSubject] = useState<string>('');
	const [typedBody, setTypedBody] = useState<string>('');
	const WORD_LIMIT = 100;
	const [clipAtHeight, setClipAtHeight] = useState<number | null>(null);

	const fontFamily = form.watch('font') || 'Arial';

	const fullName = useMemo(() => {
		if (!contact) return '';
		return contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
	}, [contact]);

	const stateAbbr = useMemo(() => {
		if (!contact?.state) return '';
		return getStateAbbreviation(contact.state) || '';
	}, [contact?.state]);

	const isUSState = useMemo(() => {
		return stateAbbr && stateBadgeColorMap.hasOwnProperty(stateAbbr);
	}, [stateAbbr]);

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
			setClipAtHeight(null);
			if (typingTimerRef.current) {
				window.clearInterval(typingTimerRef.current);
				typingTimerRef.current = null;
			}
			return;
		}
		setTypedSubject('');
		setTypedBody('');
		setClipAtHeight(null);
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

	// Capture full box height at 100 words and enable scroll
	useEffect(() => {
		const wordCount = typedBody.trim().split(/\s+/).filter(Boolean).length;
		if (clipAtHeight === null && wordCount >= WORD_LIMIT) {
			const box = boxRef.current;
			const height = box?.clientHeight || 400;
			setClipAtHeight(height);
		}
	}, [typedBody, clipAtHeight]);

	return (
		<div
			data-test-preview-panel
			className={cn(
				'w-[457px] max-[480px]:w-full h-[644px] flex flex-col relative',
				className
			)}
			style={{
				boxSizing: 'border-box',
				border: '2px solid black',
				borderRadius: '7px',
				overflow: 'hidden',
				outline: '2px solid black',
				outlineOffset: '-2px',
				backgroundColor: '#F5DE94',
				...style,
			}}
		>
			{/* Test label at the top - 22px total height with centered text */}
			<div className="w-full flex items-center px-[9px]" style={{ height: '22px' }}>
				<span className="font-inter font-bold text-[12px] leading-none text-black">
					Test
				</span>
			</div>
			{/* Horizontal divider below the label */}
			<div className="w-full bg-black" style={{ height: '1px' }} />
			<div className="flex-1 flex flex-col pb-0">
				<div className="flex-1 flex flex-col overflow-visible relative z-20">
					{/* Content area between dividers - fixed 40px height, white background */}
					<div
						className="relative px-3 sm:px-5 bg-white"
						style={{ height: '40px' }}
						data-test-preview-header
					>
						{contact && (
							<div className="h-full flex items-center">
								<div className="relative w-full">
									<div className="grid grid-cols-2 w-full overflow-visible">
										{fullName ? (
											<>
												{/* Left Column - Name and Company */}
												<div className="flex flex-col">
													<div className="p-0.5 sm:p-1 pl-2 sm:pl-3 pb-0 sm:pb-[1.5px] flex items-start">
														<div className="font-inter font-bold text-[14px] sm:text-[15.45px] w-full whitespace-normal break-words leading-[1.15] sm:leading-4">
															{fullName}
														</div>
													</div>
													<div className="p-0.5 sm:p-1 pl-2 sm:pl-3 pt-0 flex items-start">
														<div className="text-[11px] sm:text-xs text-black w-full whitespace-normal break-words leading-[1.2] sm:leading-4">
															{contact.company || ''}
														</div>
													</div>
												</div>
												{/* Right Column - Location and Title */}
												<div className="p-0.5 sm:p-1 pb-0 sm:pb-[1.5px] flex flex-col gap-[1px]">
													{/* State and City */}
													{contact.city || stateAbbr ? (
														<div className="flex items-center gap-0.5 sm:gap-2">
															{stateAbbr && (
																<span
																	className="inline-flex items-center justify-center w-[22px] h-[12px] rounded-[5px] border text-[8px] leading-none font-bold flex-shrink-0"
																	style={{
																		borderColor: 'rgba(0,0,0,0.7)',
																		backgroundColor: isUSState
																			? stateBadgeColorMap[stateAbbr]
																			: 'transparent',
																	}}
																>
																	{stateAbbr}
																</span>
															)}
															{contact.city && (
																<span className="text-[11px] sm:text-xs text-black truncate">
																	{contact.city}
																</span>
															)}
														</div>
													) : null}
													{/* Title Badge */}
													{contact.headline && (
														<div className="h-[14px] rounded-[5px] px-1 flex items-center w-[117px] bg-[#E8EFFF] border-[0.83px] border-black overflow-hidden">
															<span className="text-[9px] text-black truncate">
																{contact.headline}
															</span>
														</div>
													)}
												</div>
											</>
										) : (
											<>
												{/* Left Column - Company Name */}
												<div className="p-0.5 sm:p-1 pl-2 sm:pl-3 flex items-center">
													<div className="font-inter font-bold text-[14px] sm:text-[15.45px] w-full whitespace-normal break-words leading-[1.15] sm:leading-4">
														{contact.company || ''}
													</div>
												</div>
												{/* Right Column - Location and Title */}
												<div className="p-0.5 sm:p-1 pb-0 sm:pb-[1.5px] flex flex-col gap-[1px]">
													{/* State and City */}
													{contact.city || stateAbbr ? (
														<div className="flex items-center gap-0.5 sm:gap-2">
															{stateAbbr && (
																<span
																	className="inline-flex items-center justify-center w-[22px] h-[12px] rounded-[5px] border text-[8px] leading-none font-bold flex-shrink-0"
																	style={{
																		borderColor: 'rgba(0,0,0,0.7)',
																		backgroundColor: isUSState
																			? stateBadgeColorMap[stateAbbr]
																			: 'transparent',
																	}}
																>
																	{stateAbbr}
																</span>
															)}
															{contact.city && (
																<span className="text-[11px] sm:text-xs text-black truncate">
																	{contact.city}
																</span>
															)}
														</div>
													) : null}
													{/* Title Badge */}
													{contact.headline && (
														<div className="h-[14px] rounded-[5px] px-1 flex items-center w-[117px] bg-[#E8EFFF] border-[0.83px] border-black overflow-hidden">
															<span className="text-[9px] text-black truncate">
																{contact.headline}
															</span>
														</div>
													)}
												</div>
											</>
										)}
									</div>
									<button
										type="button"
										onClick={() => setShowTestPreview(false)}
										className="absolute right-0 top-1/2 -translate-y-1/2 p-0.5 sm:p-1 transition-all hover:brightness-75"
									>
										<CloseButtonIcon />
									</button>
								</div>
							</div>
						)}
					</div>
					{/* Second horizontal divider - 40px below the first */}
					<div className="h-[1px] bg-black" />

					{/* Subject box - 354x46px, 6px below the second divider */}
					<div
						className={cn(
							'bg-white border-2 border-black rounded-[4px] flex items-center px-3 mx-auto',
							isLoading ? 'select-none' : ''
						)}
						style={{
							width: '354px',
							height: '46px',
							marginTop: '6px',
						}}
					>
						{isLoading ? (
							<div
								aria-hidden="true"
								className="h-[14px] w-[68%] rounded-[3px] bg-[#E6E6E6] animate-pulse"
							/>
						) : (
							<span className="font-inter font-bold text-[14px] text-black truncate">
								{typedSubject}
							</span>
						)}
					</div>

					{/* Email body box - 355x504px, 4px below the subject box */}
					<div
						ref={boxRef}
						className={cn(
							'bg-white border-2 border-black rounded-[4px] mx-auto overflow-hidden relative',
							isLoading ? 'select-none' : ''
						)}
						style={{
							width: '355px',
							height: '504px',
							marginTop: '4px',
						}}
					>
						{isLoading ? (
							<div aria-hidden="true" className="h-full w-full p-4 select-none">
								<div className="space-y-3 animate-pulse">
									<div className="h-[10px] w-11/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-10/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-9/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-10/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-8/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-11/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-9/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-10/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-7/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-11/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-10/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-9/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-8/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-10/12 rounded-[3px] bg-[#E6E6E6]" />
									<div className="h-[10px] w-6/12 rounded-[3px] bg-[#E6E6E6]" />
								</div>
							</div>
						) : (
							<CustomScrollbar
								className="h-full test-preview-panel-content"
								thumbColor="#000000"
								trackColor="transparent"
								thumbWidth={2}
								offsetRight={-5}
							>
								<div ref={contentRef} className="max-w-none text-[14px] p-4">
									<div
										className="whitespace-pre-wrap leading-[1.6]"
										style={{ fontFamily }}
									>
										{typedBody}
									</div>
								</div>
							</CustomScrollbar>
						)}
					</div>

					{/* Test Again button - 355x28px, 10px below the email body box */}
					<Button
						type="button"
						onClick={onTest}
						disabled={isDisabled}
						className={
							'border-2 border-black text-black font-inter font-normal text-[17px] leading-none rounded-[4px] cursor-pointer flex items-center justify-center transition-all hover:brightness-95 active:brightness-90 mx-auto max-[480px]:hidden mobile-landscape-hide disabled:opacity-100' +
							(isDisabled ? ' cursor-not-allowed' : '')
						}
						style={{
							width: '355px',
							height: '28px',
							marginTop: '10px',
							backgroundColor: '#E6E6E6',
							lineHeight: '28px',
						}}
					>
						<span style={{ marginTop: '-2px' }}>
							{isTesting ? 'Testing...' : 'Regenerate'}
						</span>
					</Button>
				</div>
			</div>
		</div>
	);
};
