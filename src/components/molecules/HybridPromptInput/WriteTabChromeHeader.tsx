import React, { type FC, useState, useRef, useEffect } from 'react';

interface WriteTabChromeHeaderProps {
	onContactsClick?: () => void;
	onDraftsClick?: () => void;
	onInboxClick?: () => void;
}

/**
 * Small "tab chrome" header used on the Write tab.
 * Renders: dot – Write pill – dot – dot inside a 262x25 container.
 * Hovering over dots reveals navigation pills (Contacts, Drafts, Inbox).
 *
 * Positioning is handled via absolute styles so it can sit 8px above the parent panel.
 */
export const WriteTabChromeHeader: FC<WriteTabChromeHeaderProps> = ({
	onContactsClick,
	onDraftsClick,
	onInboxClick,
}) => {
	const [isDot1Hovered, setIsDot1Hovered] = useState(false);
	const [isDot2Hovered, setIsDot2Hovered] = useState(false);
	const [isDot3Hovered, setIsDot3Hovered] = useState(false);
	const wasAnyDotHoveredRef = useRef(false);

	// Box dimensions
	const boxWidth = 262;
	const boxHeight = 25;

	// Larger invisible hover-catch area so the chrome only appears when hovering
	// in the general region beneath the searchbar and above the writing panel.
	// NOTE: We intentionally expand mostly upward; only a small amount extends
	// downward into the natural gap above the panel.
	const revealAreaPaddingTop = 18;
	const revealAreaPaddingBottom = 10;

	// Pill dimensions
	const writePillWidth = 72;
	const writePillHeight = 19;
	const writePillLeft = 73;
	const pillBorderRadius = 9;
	const pillFontSize = '10px';

	// Dot dimensions and positions
	const dotSize = 9;
	const dotTop = boxHeight / 2; // vertically centered
	const dot1Left = 25;
	// Dot 2: 79px from right wall = boxWidth - 79 - dotSize = 262 - 79 - 9 = 174
	const dot2Left = boxWidth - 79 - dotSize;
	// Dot 3: 10px from right wall = boxWidth - 10 - dotSize = 262 - 10 - 9 = 243
	const dot3Left = boxWidth - 10 - dotSize;

	// Colors
	const dotColor = '#B8B8B8';

	// Check if any dot is hovered
	const isAnyDotHovered = isDot1Hovered || isDot2Hovered || isDot3Hovered;

	// Determine if we're switching between dots or entering/exiting hover
	const isSwitchingBetweenDots = wasAnyDotHoveredRef.current && isAnyDotHovered;

	// Update the ref after calculating
	useEffect(() => {
		wasAnyDotHoveredRef.current = isAnyDotHovered;
	}, [isAnyDotHovered]);

	// Transition timing
	const animatedTransition = '0.6s cubic-bezier(0.22, 1, 0.36, 1)';
	const instantTransition = '0s';
	const pillOpacityTransition = isSwitchingBetweenDots ? instantTransition : animatedTransition;

	// Contacts pill dimensions (shown when hovering dot 1)
	const contactsPillWidth = 72;
	const contactsPillHeight = writePillHeight;
	// Position Contacts pill near left edge (3px padding from box edge)
	const contactsPillLeft = 3;

	// Drafts pill dimensions (shown when hovering dot 2)
	const draftsPillWidth = 72;
	const draftsPillHeight = writePillHeight;
	// Center Drafts pill where dot 2 is
	const draftsPillLeft = dot2Left + dotSize / 2 - draftsPillWidth / 2;

	// Inbox pill dimensions (shown when hovering dot 3)
	const inboxPillWidth = 72;
	const inboxPillHeight = writePillHeight;
	// Position Inbox pill with padding from right edge
	const inboxPillLeft = boxWidth - 8 - inboxPillWidth;

	// Write pill position when hovered (moves to make room for other pills)
	const getWritePillLeft = () => {
		if (isDot1Hovered) return writePillLeft + 5; // move right slightly for Contacts
		if (isDot2Hovered) return writePillLeft - 5; // move left for Drafts
		if (isDot3Hovered) return writePillLeft - 5; // move left for Inbox
		return writePillLeft;
	};

	// Hover zone dimensions
	const hoverZoneHeight = 35;
	const hoverZoneTop = dotTop - hoverZoneHeight / 2;

	// Calculate centers and midpoints for seamless transitions
	const dot1Center = dot1Left + dotSize / 2;
	const dot2Center = dot2Left + dotSize / 2;
	const dot3Center = dot3Left + dotSize / 2;
	const midpoint1to2 = (dot1Center + dot2Center) / 2;
	const midpoint2to3 = (dot2Center + dot3Center) / 2;

	// Zone 1: extends from left edge to midpoint between dot1 and dot2
	const hoverZone1Left = 0;
	const hoverZone1Width = midpoint1to2 - hoverZone1Left;

	// Zone 2: extends from midpoint1to2 to midpoint2to3
	const hoverZone2Left = midpoint1to2;
	const hoverZone2Width = midpoint2to3 - midpoint1to2;

	// Zone 3: extends from midpoint2to3 to right edge
	const hoverZone3Left = midpoint2to3;
	const hoverZone3Width = boxWidth - midpoint2to3;

	return (
		<div
			className="write-tab-chrome-reveal-area"
			onMouseLeave={() => {
				// Ensure we fully reset hover state when leaving the general area.
				setIsDot1Hovered(false);
				setIsDot2Hovered(false);
				setIsDot3Hovered(false);
			}}
			style={{
				position: 'absolute',
				// Original chrome position:
				// - top: -36px (-(25 + 8 + 3))
				// - left: 5px  (8 - 3)
				top: `${-36 - revealAreaPaddingTop}px`,
				left: 0,
				right: 0,
				height: `${boxHeight + revealAreaPaddingTop + revealAreaPaddingBottom}px`,
				zIndex: 70,
			}}
		>
			<div
				className="write-tab-chrome-box"
				style={{
					position: 'absolute',
					top: `${revealAreaPaddingTop}px`,
					left: '5px',
					width: `${boxWidth}px`,
					height: `${boxHeight}px`,
					borderRadius: '9px',
					border: '2px solid #000000',
					backgroundColor: '#E3E7E4',
					boxSizing: 'border-box',
				}}
			>
			{/* Write pill - transforms to white and moves on hover */}
			<div
				style={{
					position: 'absolute',
					top: '50%',
					transform: 'translateY(-50%)',
					left: `${getWritePillLeft()}px`,
					width: `${writePillWidth}px`,
					height: `${writePillHeight}px`,
					borderRadius: `${pillBorderRadius}px`,
					border: '2px solid #000000',
					backgroundColor: isAnyDotHovered ? '#FFFFFF' : '#A6E2A8',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					transition: `left ${animatedTransition}, background-color ${animatedTransition}`,
				}}
			>
				<span
					className="font-bold text-black leading-none"
					style={{
						fontSize: pillFontSize,
						opacity: isAnyDotHovered ? 0 : 1,
						transition: `opacity ${animatedTransition}`,
					}}
				>
					Write
				</span>
			</div>

			{/* Contacts pill - shown when hovering dot 1 */}
			<div
				style={{
					position: 'absolute',
					top: '50%',
					transform: 'translateY(-50%)',
					left: `${contactsPillLeft}px`,
					width: `${contactsPillWidth}px`,
					height: `${contactsPillHeight}px`,
					backgroundColor: '#F5DADA',
					border: '2px solid #000000',
					borderRadius: `${pillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					opacity: isDot1Hovered ? 1 : 0,
					pointerEvents: isDot1Hovered ? 'auto' : 'none',
					transition: `opacity ${pillOpacityTransition}`,
					cursor: onContactsClick ? 'pointer' : 'default',
				}}
				onClick={(e) => {
					e.stopPropagation();
					onContactsClick?.();
				}}
			>
				<span
					className="font-bold text-black leading-none"
					style={{ fontSize: pillFontSize }}
				>
					Contacts
				</span>
			</div>

			{/* Drafts pill - shown when hovering dot 2 */}
			<div
				style={{
					position: 'absolute',
					top: '50%',
					transform: 'translateY(-50%)',
					left: `${draftsPillLeft}px`,
					width: `${draftsPillWidth}px`,
					height: `${draftsPillHeight}px`,
					backgroundColor: '#EFDAAF',
					border: '2px solid #000000',
					borderRadius: `${pillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					opacity: isDot2Hovered ? 1 : 0,
					pointerEvents: isDot2Hovered ? 'auto' : 'none',
					transition: `opacity ${pillOpacityTransition}`,
					cursor: onDraftsClick ? 'pointer' : 'default',
				}}
				onClick={(e) => {
					e.stopPropagation();
					onDraftsClick?.();
				}}
			>
				<span
					className="font-bold text-black leading-none"
					style={{ fontSize: pillFontSize }}
				>
					Drafts
				</span>
			</div>

			{/* Inbox pill - shown when hovering dot 3 */}
			<div
				style={{
					position: 'absolute',
					top: '50%',
					transform: 'translateY(-50%)',
					left: `${inboxPillLeft}px`,
					width: `${inboxPillWidth}px`,
					height: `${inboxPillHeight}px`,
					backgroundColor: '#CCDFF4',
					border: '2px solid #000000',
					borderRadius: `${pillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					opacity: isDot3Hovered ? 1 : 0,
					pointerEvents: isDot3Hovered ? 'auto' : 'none',
					transition: `opacity ${pillOpacityTransition}`,
					cursor: onInboxClick ? 'pointer' : 'default',
				}}
				onClick={(e) => {
					e.stopPropagation();
					onInboxClick?.();
				}}
			>
				<span
					className="font-bold text-black leading-none"
					style={{ fontSize: pillFontSize }}
				>
					Inbox
				</span>
			</div>

			{/* Dot 1 - hidden when hovered */}
			<div
				style={{
					position: 'absolute',
					top: '50%',
					transform: 'translateY(-50%)',
					left: `${dot1Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
					opacity: isDot1Hovered ? 0 : 1,
					transition: `opacity ${pillOpacityTransition}`,
				}}
			/>

			{/* Dot 2 - hidden when hovered or when Inbox pill is visible */}
			<div
				style={{
					position: 'absolute',
					top: '50%',
					transform: 'translateY(-50%)',
					left: `${dot2Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
					opacity: isDot2Hovered || isDot3Hovered ? 0 : 1,
					transition: `opacity ${pillOpacityTransition}`,
				}}
			/>

			{/* Dot 3 - hidden when hovered */}
			<div
				style={{
					position: 'absolute',
					top: '50%',
					transform: 'translateY(-50%)',
					left: `${dot3Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
					opacity: isDot3Hovered ? 0 : 1,
					transition: `opacity ${pillOpacityTransition}`,
				}}
			/>

			{/* Invisible hover zone for dot 1 */}
			<div
				onMouseEnter={() => setIsDot1Hovered(true)}
				onMouseLeave={() => setIsDot1Hovered(false)}
				onClick={(e) => {
					e.stopPropagation();
					onContactsClick?.();
				}}
				style={{
					position: 'absolute',
					top: `${hoverZoneTop}px`,
					left: `${hoverZone1Left}px`,
					width: `${hoverZone1Width}px`,
					height: `${hoverZoneHeight}px`,
					zIndex: 20,
					cursor: onContactsClick ? 'pointer' : 'default',
				}}
			/>

			{/* Invisible hover zone for dot 2 */}
			<div
				onMouseEnter={() => setIsDot2Hovered(true)}
				onMouseLeave={() => setIsDot2Hovered(false)}
				onClick={(e) => {
					e.stopPropagation();
					onDraftsClick?.();
				}}
				style={{
					position: 'absolute',
					top: `${hoverZoneTop}px`,
					left: `${hoverZone2Left}px`,
					width: `${hoverZone2Width}px`,
					height: `${hoverZoneHeight}px`,
					zIndex: 20,
					cursor: onDraftsClick ? 'pointer' : 'default',
				}}
			/>

			{/* Invisible hover zone for dot 3 */}
			<div
				onMouseEnter={() => setIsDot3Hovered(true)}
				onMouseLeave={() => setIsDot3Hovered(false)}
				onClick={(e) => {
					e.stopPropagation();
					onInboxClick?.();
				}}
				style={{
					position: 'absolute',
					top: `${hoverZoneTop}px`,
					left: `${hoverZone3Left}px`,
					width: `${hoverZone3Width}px`,
					height: `${hoverZoneHeight}px`,
					zIndex: 20,
					cursor: onInboxClick ? 'pointer' : 'default',
				}}
			/>
			</div>

			<style jsx>{`
				/* Default: visible (important for touch / non-hover devices) */
				.write-tab-chrome-box {
					opacity: 1;
					pointer-events: auto;
				}

				/* Hover devices: hidden until hovering the reveal area */
				@media (hover: hover) and (pointer: fine) {
					.write-tab-chrome-box {
						opacity: 0;
						pointer-events: none;
						transition:
							opacity 220ms cubic-bezier(0.22, 1, 0.36, 1);
					}

					.write-tab-chrome-reveal-area:hover .write-tab-chrome-box {
						opacity: 1;
						pointer-events: auto;
					}
				}
			`}</style>
		</div>
	);
};
