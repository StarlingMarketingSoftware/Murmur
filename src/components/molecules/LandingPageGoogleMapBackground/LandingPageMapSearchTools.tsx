'use client';

import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import HomeExpandedIcon from '@/components/atoms/_svg/HomeExpandedIcon';
import HomeIcon from '@/components/atoms/_svg/HomeIcon';
import GrabIcon from '@/components/atoms/svg/GrabIcon';
import { useCallback, useState } from 'react';

/**
 * Landing page-only copy of the dashboard map-view "tools" that sit to the right of the search bar.
 * This is intentionally a near-verbatim copy from `src/app/murmur/dashboard/page.tsx`.
 */
export function LandingPageMapSearchTools() {
	const [activeMapTool, setActiveMapTool] = useState<'select' | 'grab'>('grab');
	// Preserve the dashboard behavior: when select is active, a second click triggers "select all".
	// Landing page is visual-only, but we keep the exact interaction shape.
	const [, setSelectAllInViewNonce] = useState(0);

	const isSelectMapToolActive = activeMapTool === 'select';
	const isGrabMapToolActive = activeMapTool === 'grab';

	const handleSelectMapToolClick = useCallback(() => {
		// First click: activate Select tool. Second click (while active): select all visible.
		if (!isSelectMapToolActive) {
			setActiveMapTool('select');
			return;
		}
		setSelectAllInViewNonce((n) => n + 1);
	}, [isSelectMapToolActive]);

	const handleHomeClick = useCallback(() => {
		// Landing-page demo: reset back to grab mode.
		setActiveMapTool('grab');
	}, []);

	// Static landing-page values (match the demo search bar defaults).
	const TrayWhatIcon = MusicVenuesIcon;
	const trayWhatIconSize: number | undefined = undefined;
	const trayWhat = { backgroundColor: '#71C9FD' };
	const effectiveWhatKeyForTray = 'Music Venues';

	return (
		<>
			{/* Box to the left of the Home button */}
			<div
				className="group relative h-[52px] hover:h-[80px]"
				style={{
					...(() => {
						const buttonSize = 43;
						const gap = isSelectMapToolActive ? 8 : 20;
						// Existing collapsed design: 2 buttons + 20px gap inside a 130px wrapper.
						// That leaves ~12px padding on each side (24px total).
						const horizontalPadding = 24;
						const innerWidth = isSelectMapToolActive ? buttonSize * 3 + gap * 2 : buttonSize * 2 + gap;
						const wrapperWidth = innerWidth + horizontalPadding;
						// Landing page tweak: when the Select tool expands to show the extra category tile,
						// nudge the whole box a few pixels to the right so it doesn't collide with the search bar.
						// (We keep the dashboard copy exact everywhere else.)
						const gapToHomeButton = isSelectMapToolActive ? 2 : 10;
						return {
							width: `${wrapperWidth}px`,
							left: `calc(100% + 179px - ${wrapperWidth + gapToHomeButton}px)`,
						};
					})(),
					position: 'absolute',
					// Search bar wrapper sits at 33px viewport in dashboard map-view; `top: 1px` places
					// the tools visually aligned with the 52px trays/buttons. We keep this exact offset.
					top: '1px',
					// Home button is at: calc(100% + 179px). This box should be 10px to its left.
					borderRadius: '6px',
					backgroundColor: 'rgba(255, 255, 255, 0.9)', // #FFFFFF @ 90%
					border: '3px solid #000000',
				}}
				aria-hidden
			>
				{/* Keep the buttons pinned to the collapsed center so expanding height doesn't move them */}
				<div
					className={`absolute left-1/2 top-[24px] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center ${
						isSelectMapToolActive ? 'gap-[8px]' : 'gap-[20px]'
					}`}
				>
					{isSelectMapToolActive ? (
						<>
							{/* Left: active "What" category icon from the current search */}
							<div className="relative">
								<div
									aria-label={`Active category: ${effectiveWhatKeyForTray || 'Music Venues'}`}
									className="flex items-center justify-center"
									style={{
										width: '43px',
										height: '43px',
										borderRadius: '9px',
										backgroundColor: trayWhat.backgroundColor,
									}}
								>
									<TrayWhatIcon size={trayWhatIconSize} />
								</div>
							</div>

							{/* Center: Select tool */}
							<div className="relative">
								<button
									type="button"
									onClick={handleSelectMapToolClick}
									aria-label="Select tool"
									aria-pressed={isSelectMapToolActive}
									className="flex items-center justify-center font-inter text-[16px] font-semibold leading-none text-black"
									style={{
										width: '43px',
										height: '43px',
										borderRadius: '9px',
										backgroundColor: isSelectMapToolActive ? '#999999' : 'rgba(153, 153, 153, 0.3)', // #999999 @ 30%
										cursor: 'pointer',
										padding: 0,
										border: 'none',
									}}
								>
									<div
										aria-hidden="true"
										style={{
											width: '24px',
											height: '24px',
											backgroundColor: isSelectMapToolActive ? '#999999' : 'transparent',
											border: '2px solid #000000',
											boxSizing: 'border-box',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
										}}
									>
										{isSelectMapToolActive && (
											<span
												className="font-inter"
												style={{
													fontSize: '8px',
													fontWeight: 500,
													color: '#000000',
													lineHeight: 1,
												}}
											>
												All
											</span>
										)}
									</div>
								</button>
								{isSelectMapToolActive && (
									<div className="pointer-events-none absolute left-1/2 top-[51px] -translate-x-1/2 opacity-0 group-hover:opacity-100 font-inter text-[16px] font-semibold leading-none text-black select-none whitespace-nowrap">
										Select
									</div>
								)}
							</div>

							{/* Right: Grab tool */}
							<div className="relative">
								<button
									type="button"
									onClick={() => setActiveMapTool('grab')}
									aria-label="Grab tool"
									aria-pressed={isGrabMapToolActive}
									className="flex items-center justify-center"
									style={{
										width: '43px',
										height: '43px',
										borderRadius: '9px',
										backgroundColor: isGrabMapToolActive ? '#4CDE71' : '#999999',
										cursor: 'pointer',
										padding: 0,
										border: 'none',
									}}
								>
									<GrabIcon innerFill="#FFFFFF" />
								</button>
							</div>
						</>
					) : (
						<>
							<div className="relative">
								<button
									type="button"
									onClick={handleSelectMapToolClick}
									aria-label="Select tool"
									aria-pressed={isSelectMapToolActive}
									className="flex items-center justify-center"
									style={{
										width: '43px',
										height: '43px',
										borderRadius: '9px',
										backgroundColor: isSelectMapToolActive ? '#999999' : 'rgba(153, 153, 153, 0.3)', // #999999 @ 30%
										cursor: 'pointer',
										padding: 0,
										border: 'none',
									}}
								>
									<div
										aria-hidden="true"
										style={{
											width: '24px',
											height: '24px',
											backgroundColor: isSelectMapToolActive ? '#999999' : 'transparent',
											border: '2px solid #000000',
											boxSizing: 'border-box',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
										}}
									>
										{isSelectMapToolActive && (
											<span
												className="font-inter"
												style={{
													fontSize: '8px',
													fontWeight: 500,
													color: '#000000',
													lineHeight: 1,
												}}
											>
												All
											</span>
										)}
									</div>
								</button>
								{isSelectMapToolActive && (
									<div className="pointer-events-none absolute left-1/2 top-[51px] -translate-x-1/2 opacity-0 group-hover:opacity-100 font-inter text-[16px] font-semibold leading-none text-black select-none whitespace-nowrap">
										Select
									</div>
								)}
							</div>
							<div className="relative">
								<button
									type="button"
									onClick={() => setActiveMapTool('grab')}
									aria-label="Grab tool"
									aria-pressed={isGrabMapToolActive}
									className="flex items-center justify-center"
									style={{
										width: '43px',
										height: '43px',
										borderRadius: '9px',
										backgroundColor: isGrabMapToolActive ? '#4CDE71' : '#999999',
										cursor: 'pointer',
										padding: 0,
										border: 'none',
									}}
								>
									<GrabIcon innerFill="#FFFFFF" />
								</button>
								{isGrabMapToolActive && (
									<div className="pointer-events-none absolute left-1/2 top-[51px] -translate-x-1/2 opacity-0 group-hover:opacity-100 font-inter text-[16px] font-semibold leading-none text-black select-none whitespace-nowrap">
										Grab
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</div>

			<button
				type="button"
				onClick={handleHomeClick}
				aria-label="Home"
				className="group flex items-center justify-center cursor-pointer w-[52px] hover:w-[155px]"
				style={{
					position: 'absolute',
					// Search bar wrapper sits at 33px viewport in dashboard map-view; `top: 1px` aligns with that.
					top: '1px',
					// "179px to the right of the searchbar" => from wrapper's right edge.
					left: 'calc(100% + 179px)',
					height: '52px',
					borderRadius: '9px',
					backgroundColor: '#D6D6D6',
					border: '3px solid #000000',
					padding: '2px',
				}}
			>
				<div
					className="flex items-center justify-center w-[42px] group-hover:w-[143px]"
					style={{
						height: '42px',
						borderRadius: '9px',
						backgroundColor: '#EAEAEA',
					}}
				>
					{/* Default: show house icon */}
					<span className="group-hover:hidden flex items-center justify-center">
						<HomeIcon width={20} height={17} />
					</span>
					{/* Hover: show "Home" text SVG */}
					<HomeExpandedIcon className="hidden group-hover:block" width={80} height={21} />
				</div>
			</button>
		</>
	);
}

