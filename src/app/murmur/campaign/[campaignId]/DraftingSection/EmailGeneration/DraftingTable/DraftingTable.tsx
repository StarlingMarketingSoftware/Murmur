import { FC, ReactNode, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { urls } from '@/constants/urls';
import ApproveCheckIcon from '@/components/atoms/svg/ApproveCheckIcon';
import RejectXIcon from '@/components/atoms/svg/RejectXIcon';
import { useCampaignTopSearchHighlight } from '@/contexts/CampaignTopSearchHighlightContext';
import { DraftingTableSkeleton } from './DraftingTableSkeleton';

export const ContactsHeaderChrome: FC<{
	offsetY?: number;
	hasData?: boolean;
	isAllTab?: boolean;
	whiteSectionHeight?: number;
	onWriteClick?: () => void;
	onDraftsClick?: () => void;
	onInboxClick?: () => void;
	/**
	 * Which campaign tab is currently active.
	 * Used to render the hovered pill as a "white placeholder" when it represents the active tab.
	 */
	activeTab?: 'contacts' | 'write' | 'drafts' | 'inbox';
	/**
	 * When false, renders a static header (no hover pill animation, no dot hover/click zones).
	 * Useful for small preview/expanded-list variants where the full interaction feels noisy.
	 */
	interactive?: boolean;
}> = ({
	offsetY = 0,
	hasData = true,
	isAllTab = false,
	whiteSectionHeight,
	onWriteClick,
	onDraftsClick,
	onInboxClick,
	activeTab = 'contacts',
	interactive = true,
}) => {
	const [isDot1Hovered, setIsDot1Hovered] = useState(false);
	const [isDot2Hovered, setIsDot2Hovered] = useState(false);
	const [isDot3Hovered, setIsDot3Hovered] = useState(false);
	const wasAnyDotHoveredRef = useRef(false);
	const isBottomView = whiteSectionHeight === 15;
	const isWriteActiveTab = activeTab === 'write';
	const dotColor = hasData ? '#D9D9D9' : '#B0B0B0';
	const pillBorderColor = hasData ? '#8D5B5B' : '#B0B0B0';
	const pillTextColor = hasData ? '#000000' : '#B0B0B0';
	const pillBgColor = hasData ? '#F5DADA' : '#FFAEAE';
	const dotSize = isBottomView ? 5 : isAllTab ? 6 : 9;
	// Adjust left position to center smaller dots (add 1.5px to keep same visual center)
	const dot1Left = isBottomView ? 75 : isAllTab ? 118.5 : 117;
	const dot2Left = isBottomView ? 110 : isAllTab ? 177.5 : 176;
	const dot3Left = isBottomView ? 146 : isAllTab ? 236.5 : 235;
	// Pill dimensions for All tab
	const pillWidth = isBottomView ? 40 : isAllTab ? 50 : 72;
	const pillHeight = isBottomView ? 10 : isAllTab ? 15 : 22;
	const pillBorderRadius = isBottomView ? 5 : isAllTab ? 7.5 : 11;
	const pillFontSize = isBottomView ? '6px' : isAllTab ? '10px' : '13px';
	// Center dots vertically with the pill - calculate both positions relative to each other
	// Add a tiny visual padding so the pill doesn't visually "kiss" the top border in tighter headers.
	const visualTopPaddingPx = 1;
	const pillTopBase = whiteSectionHeight !== undefined ? (whiteSectionHeight - pillHeight) / 2 : 3;
	const pillTop = pillTopBase + offsetY + visualTopPaddingPx;
	const pillCenterY = pillTop + pillHeight / 2;
	const dotTop = Math.round(pillCenterY - dotSize / 2);
	const pillLeft = isBottomView ? 18 : 21;

	// Check if any dot is hovered (for Contacts pill transformation)
	const isAnyDotHovered = isDot1Hovered || isDot2Hovered || isDot3Hovered;
	
	// Determine if we're switching between dots (instant) or entering/exiting hover (animated)
	// Switching between dots: wasAnyHovered && isAnyHovered (stays in hover, just different dot)
	// Entering/exiting: wasAnyHovered !== isAnyHovered
	const isSwitchingBetweenDots = wasAnyDotHoveredRef.current && isAnyDotHovered;
	
	// Update the ref after calculating (for next render)
	useEffect(() => {
		wasAnyDotHoveredRef.current = isAnyDotHovered;
	}, [isAnyDotHovered]);
	
	// Transition timing
	const animatedTransition = '0.6s cubic-bezier(0.22, 1, 0.36, 1)';
	const instantTransition = '0s';
	const pillOpacityTransition = isSwitchingBetweenDots ? instantTransition : animatedTransition;

	// Write pill dimensions (shown when hovering dot 1)
	const writePillWidth = 73;
	const writePillHeight = pillHeight;
	const writePillBorderRadius = pillBorderRadius;
	const writePillFontSize = pillFontSize;
	// Position Write pill centered where dot 1 was
	const writePillLeft = dot1Left + dotSize / 2 - writePillWidth / 2;

	// Drafts pill dimensions (shown when hovering dot 2)
	const draftsPillWidth = 73;
	const draftsPillHeight = pillHeight;
	const draftsPillBorderRadius = pillBorderRadius;
	const draftsPillFontSize = pillFontSize;
	// Position Drafts pill centered where dot 2 was
	const draftsPillLeft = dot2Left + dotSize / 2 - draftsPillWidth / 2;

	// Inbox pill dimensions (shown when hovering dot 3)
	const inboxPillWidth = 73;
	const inboxPillHeight = pillHeight;
	const inboxPillBorderRadius = pillBorderRadius;
	const inboxPillFontSize = pillFontSize;
	// Position Inbox pill centered where dot 3 was
	const inboxPillLeft = dot3Left + dotSize / 2 - inboxPillWidth / 2;

	// Hover zone dimensions - wide zones that meet at midpoints for smooth transitions
	const hoverZoneHeight = isBottomView ? 20 : isAllTab ? 25 : 40;
	const hoverZoneTop = dotTop + dotSize / 2 - hoverZoneHeight / 2;
	
	// Calculate midpoints between dots for seamless transition
	const dot1Center = dot1Left + dotSize / 2;
	const dot2Center = dot2Left + dotSize / 2;
	const dot3Center = dot3Left + dotSize / 2;
	const midpoint1to2 = (dot1Center + dot2Center) / 2;
	const midpoint2to3 = (dot2Center + dot3Center) / 2;
	
	// Zone 1: extends from before dot1 to midpoint between dot1 and dot2
	const hoverZone1Left = dot1Center - 30; // 30px before dot1 center
	const hoverZone1Width = midpoint1to2 - hoverZone1Left;
	
	// Zone 2: extends from midpoint1to2 to midpoint2to3
	const hoverZone2Left = midpoint1to2;
	const hoverZone2Width = midpoint2to3 - midpoint1to2;
	
	// Zone 3: extends from midpoint2to3 to after dot3
	const hoverZone3Left = midpoint2to3;
	const hoverZone3Width = dot3Center + 30 - midpoint2to3; // 30px after dot3 center

	return (
		<>
			{/* Contacts pill - transforms to white empty pill on any dot hover */}
			<div
				data-campaign-shared-pill="campaign-tabs-pill"
				data-campaign-shared-pill-variant="contacts"
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: isAnyDotHovered ? '3px' : `${pillLeft}px`,
					width: `${pillWidth}px`,
					height: `${pillHeight}px`,
					backgroundColor: isAnyDotHovered ? '#FFFFFF' : pillBgColor,
					border: isAnyDotHovered ? '2px solid #000000' : `2px solid ${pillBorderColor}`,
					borderRadius: `${pillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					transition: 'left 0.6s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.6s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
				}}
			>
				<span
					className="font-semibold font-inter leading-none"
					style={{ 
						color: pillTextColor, 
						fontSize: pillFontSize, 
						textAlign: 'center', 
						width: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
						marginTop: isBottomView ? '-1px' : isAllTab ? '-1px' : 0, // Optical alignment adjustment
						opacity: isAnyDotHovered ? 0 : 1,
						transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
					}}
				>
					Contacts
				</span>
			</div>

			{interactive && (
				<>
					{/* Write pill - shown when hovering dot 1 */}
					<div
						style={{
							position: 'absolute',
							top: `${pillTop}px`,
							left: `${writePillLeft}px`,
							width: `${writePillWidth}px`,
							height: `${writePillHeight}px`,
							// If this header is rendered on the Write tab, hovering "Write" should
							// show the same white-placeholder state as the active pill.
							backgroundColor: isWriteActiveTab ? '#FFFFFF' : '#A6E2A8',
							border: '2px solid #000000',
							borderRadius: `${writePillBorderRadius}px`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							zIndex: 10,
							opacity: isDot1Hovered ? 1 : 0,
							pointerEvents: isDot1Hovered ? 'auto' : 'none',
							transition: `opacity ${pillOpacityTransition}`,
							cursor: isWriteActiveTab ? 'default' : onWriteClick ? 'pointer' : undefined,
						}}
						onClick={(e) => {
							e.stopPropagation();
							onWriteClick?.();
						}}
					>
						<span
							className="font-semibold font-inter leading-none"
							style={{
								color: '#000000',
								fontSize: writePillFontSize,
								textAlign: 'center',
								width: '100%',
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
								height: '100%',
								marginTop: isBottomView ? '-1px' : isAllTab ? '-1px' : 0,
								opacity: isWriteActiveTab ? 0 : 1,
								transition: `opacity ${pillOpacityTransition}`,
							}}
						>
							Write
						</span>
					</div>

					{/* Drafts pill - shown when hovering dot 2 */}
					<div
						style={{
							position: 'absolute',
							top: `${pillTop}px`,
							left: `${draftsPillLeft}px`,
							width: `${draftsPillWidth}px`,
							height: `${draftsPillHeight}px`,
							backgroundColor: '#EFDAAF',
							border: '2px solid #000000',
							borderRadius: `${draftsPillBorderRadius}px`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							zIndex: 10,
							opacity: isDot2Hovered ? 1 : 0,
							pointerEvents: isDot2Hovered ? 'auto' : 'none',
							transition: `opacity ${pillOpacityTransition}`,
							cursor: onDraftsClick ? 'pointer' : undefined,
						}}
						onClick={(e) => {
							e.stopPropagation();
							onDraftsClick?.();
						}}
					>
						<span
							className="font-semibold font-inter leading-none"
							style={{
								color: '#000000',
								fontSize: draftsPillFontSize,
								textAlign: 'center',
								width: '100%',
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
								height: '100%',
								marginTop: isBottomView ? '-1px' : isAllTab ? '-1px' : 0,
							}}
						>
							Drafts
						</span>
					</div>

					{/* Inbox pill - shown when hovering dot 3 */}
					<div
						style={{
							position: 'absolute',
							top: `${pillTop}px`,
							left: `${inboxPillLeft}px`,
							width: `${inboxPillWidth}px`,
							height: `${inboxPillHeight}px`,
							backgroundColor: '#CCDFF4',
							border: '2px solid #000000',
							borderRadius: `${inboxPillBorderRadius}px`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							zIndex: 10,
							opacity: isDot3Hovered ? 1 : 0,
							pointerEvents: isDot3Hovered ? 'auto' : 'none',
							transition: `opacity ${pillOpacityTransition}`,
							cursor: onInboxClick ? 'pointer' : undefined,
						}}
						onClick={(e) => {
							e.stopPropagation();
							onInboxClick?.();
						}}
					>
						<span
							className="font-semibold font-inter leading-none"
							style={{
								color: '#000000',
								fontSize: inboxPillFontSize,
								textAlign: 'center',
								width: '100%',
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
								height: '100%',
								marginTop: isBottomView ? '-1px' : isAllTab ? '-1px' : 0,
							}}
						>
							Inbox
						</span>
					</div>
				</>
			)}

			{/* Dot 1 - hidden when hovered */}
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
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

			{/* Invisible hover zone for dot 1 */}
			{interactive && (
				<div
					onMouseEnter={() => setIsDot1Hovered(true)}
					onMouseLeave={() => setIsDot1Hovered(false)}
					onClick={(e) => {
						e.stopPropagation();
						onWriteClick?.();
					}}
					style={{
						position: 'absolute',
						top: `${hoverZoneTop}px`,
						left: `${hoverZone1Left}px`,
						width: `${hoverZone1Width}px`,
						height: `${hoverZoneHeight}px`,
						zIndex: 20,
						cursor: 'pointer',
					}}
				/>
			)}

			{/* Dot 2 - hidden when hovered */}
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${dot2Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
					opacity: isDot2Hovered ? 0 : 1,
					transition: `opacity ${pillOpacityTransition}`,
				}}
			/>

			{/* Invisible hover zone for dot 2 */}
			{interactive && (
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
			)}

			{/* Dot 3 - hidden when hovered */}
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
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

			{/* Invisible hover zone for dot 3 */}
			{interactive && (
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
			)}
		</>
	);
};

export const DraftsHeaderChrome: FC<{
	hasData?: boolean;
	onContactsClick?: () => void;
	onWriteClick?: () => void;
	onInboxClick?: () => void;
}> = ({ hasData = true, onContactsClick, onWriteClick, onInboxClick }) => {
	const [isDot1Hovered, setIsDot1Hovered] = useState(false);
	const [isDot2Hovered, setIsDot2Hovered] = useState(false);
	const [isDot3Hovered, setIsDot3Hovered] = useState(false);
	const wasAnyDotHoveredRef = useRef(false);
	
	// Drafts tab positions (from existing code)
	const pillTop = 4;
	const pillHeight = 22;
	const pillWidth = 72;
	const pillBorderRadius = 11;
	const pillFontSize = '13px';
	const dotSize = 9;
	const dotTop = 11;
	
	// Existing positions
	// Order: dot (Contacts) – dot (Write) – Drafts pill – dot (Inbox)
	// (Moves the Drafts pill one slot right and shifts the adjacent dot left of it.)
	const dot1Left = 36;
	const dot2Left = 102;
	const draftsPillLeft = 137;
	const dot3Left = 235;
	
	// Colors
	const dotColor = hasData ? '#D9D9D9' : '#B0B0B0';
	const draftsPillBgColor = hasData ? '#FFECDC' : '#F8D69A';
	const draftsPillBorderColor = hasData ? '#A8833A' : '#B0B0B0';
	const pillTextColor = hasData ? '#000000' : '#B0B0B0';
	
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
	const contactsPillWidth = 73;
	const contactsPillHeight = pillHeight;
	const contactsPillBorderRadius = pillBorderRadius;
	const contactsPillFontSize = pillFontSize;
	// Position Contacts pill centered where dot 1 was
	const contactsPillLeft = dot1Left + dotSize / 2 - contactsPillWidth / 2;
	
	// Write pill dimensions (shown when hovering dot 2)
	const writePillWidth = 73;
	const writePillHeight = pillHeight;
	const writePillBorderRadius = pillBorderRadius;
	const writePillFontSize = pillFontSize;
	// Position Write pill centered where dot 2 was
	const writePillLeft = dot2Left + dotSize / 2 - writePillWidth / 2;
	
	// Inbox pill dimensions (shown when hovering dot 3)
	const inboxPillWidth = 73;
	const inboxPillHeight = pillHeight;
	const inboxPillBorderRadius = pillBorderRadius;
	const inboxPillFontSize = pillFontSize;
	// Position Inbox pill centered where dot 3 was
	const inboxPillLeft = dot3Left + dotSize / 2 - inboxPillWidth / 2;
	
	// New position for Drafts pill when hovered
	// Moves right when dot 1 or 2 is hovered (to make room for Contacts/Write pills on left)
	// Moves left when dot 3 is hovered (to make room for Inbox pill on right)
	const draftsPillLeftHoveredRight = draftsPillLeft + 18;
	const draftsPillLeftHoveredLeft = draftsPillLeft - 18;
	const getDraftsPillLeft = () => {
		if (isDot1Hovered || isDot2Hovered) return draftsPillLeftHoveredRight;
		if (isDot3Hovered) return draftsPillLeftHoveredLeft;
		return draftsPillLeft;
	};
	
	// Hover zone dimensions
	const hoverZoneHeight = 40;
	const hoverZoneTop = dotTop + dotSize / 2 - hoverZoneHeight / 2;
	
	// Calculate centers and midpoints for seamless transitions
	const dot1Center = dot1Left + dotSize / 2;
	const dot2Center = dot2Left + dotSize / 2;
	const dot3Center = dot3Left + dotSize / 2;
	const midpoint1to2 = (dot1Center + dot2Center) / 2;
	const midpoint2to3 = (dot2Center + dot3Center) / 2;
	
	// Zone 1: extends from before dot1 to midpoint between dot1 and dot2
	const hoverZone1Left = dot1Center - 30;
	const hoverZone1Width = midpoint1to2 - hoverZone1Left;
	
	// Zone 2: extends from midpoint1to2 to midpoint2to3
	const hoverZone2Left = midpoint1to2;
	const hoverZone2Width = midpoint2to3 - midpoint1to2;
	
	// Zone 3: extends from midpoint2to3 to after dot3
	const hoverZone3Left = midpoint2to3;
	const hoverZone3Width = dot3Center + 30 - midpoint2to3;
	
	return (
		<>
			{/* Drafts pill - transforms to white pill and moves on hover */}
			<div
				data-campaign-shared-pill="campaign-tabs-pill"
				data-campaign-shared-pill-variant="drafts"
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: `${getDraftsPillLeft()}px`,
					width: `${pillWidth}px`,
					height: `${pillHeight}px`,
					backgroundColor: isAnyDotHovered ? '#FFFFFF' : draftsPillBgColor,
					border: isAnyDotHovered ? '2px solid #000000' : `2px solid ${draftsPillBorderColor}`,
					borderRadius: `${pillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					transition: `left ${animatedTransition}, background-color ${animatedTransition}, border-color ${animatedTransition}`,
				}}
			>
				<span
					className="font-semibold font-inter leading-none"
					style={{ 
						color: pillTextColor, 
						fontSize: pillFontSize, 
						textAlign: 'center', 
						width: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
						opacity: isAnyDotHovered ? 0 : 1,
						transition: `opacity ${animatedTransition}`,
					}}
				>
					Drafts
				</span>
			</div>

			{/* Contacts pill - shown when hovering dot 1 */}
			<div
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: `${contactsPillLeft}px`,
					width: `${contactsPillWidth}px`,
					height: `${contactsPillHeight}px`,
					backgroundColor: '#F5DADA',
					border: '2px solid #000000',
					borderRadius: `${contactsPillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					opacity: isDot1Hovered ? 1 : 0,
					pointerEvents: isDot1Hovered ? 'auto' : 'none',
					transition: `opacity ${pillOpacityTransition}`,
					cursor: onContactsClick ? 'pointer' : undefined,
				}}
				onClick={(e) => {
					e.stopPropagation();
					onContactsClick?.();
				}}
			>
				<span
					className="font-semibold font-inter leading-none"
					style={{ 
						color: '#000000', 
						fontSize: contactsPillFontSize, 
						textAlign: 'center', 
						width: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
					}}
				>
					Contacts
				</span>
			</div>

			{/* Write pill - shown when hovering dot 2 */}
			<div
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: `${writePillLeft}px`,
					width: `${writePillWidth}px`,
					height: `${writePillHeight}px`,
					backgroundColor: '#A6E2A8',
					border: '2px solid #000000',
					borderRadius: `${writePillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					opacity: isDot2Hovered ? 1 : 0,
					pointerEvents: isDot2Hovered ? 'auto' : 'none',
					transition: `opacity ${pillOpacityTransition}`,
					cursor: onWriteClick ? 'pointer' : undefined,
				}}
				onClick={(e) => {
					e.stopPropagation();
					onWriteClick?.();
				}}
			>
				<span
					className="font-semibold font-inter leading-none"
					style={{ 
						color: '#000000', 
						fontSize: writePillFontSize, 
						textAlign: 'center', 
						width: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
					}}
				>
					Write
				</span>
			</div>

			{/* Inbox pill - shown when hovering dot 3 */}
			<div
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: `${inboxPillLeft}px`,
					width: `${inboxPillWidth}px`,
					height: `${inboxPillHeight}px`,
					backgroundColor: '#CCDFF4',
					border: '2px solid #000000',
					borderRadius: `${inboxPillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					opacity: isDot3Hovered ? 1 : 0,
					pointerEvents: isDot3Hovered ? 'auto' : 'none',
					transition: `opacity ${pillOpacityTransition}`,
					cursor: onInboxClick ? 'pointer' : undefined,
				}}
				onClick={(e) => {
					e.stopPropagation();
					onInboxClick?.();
				}}
			>
				<span
					className="font-semibold font-inter leading-none"
					style={{ 
						color: '#000000', 
						fontSize: inboxPillFontSize, 
						textAlign: 'center', 
						width: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
					}}
				>
					Inbox
				</span>
			</div>

			{/* Dot 1 - hidden when hovered */}
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
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

			{/* Dot 2 - hidden when hovered */}
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${dot2Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
					opacity: isDot2Hovered ? 0 : 1,
					transition: `opacity ${pillOpacityTransition}`,
				}}
			/>

			{/* Invisible hover zone for dot 2 */}
			<div
				onMouseEnter={() => setIsDot2Hovered(true)}
				onMouseLeave={() => setIsDot2Hovered(false)}
				onClick={(e) => {
					e.stopPropagation();
					onWriteClick?.();
				}}
				style={{
					position: 'absolute',
					top: `${hoverZoneTop}px`,
					left: `${hoverZone2Left}px`,
					width: `${hoverZone2Width}px`,
					height: `${hoverZoneHeight}px`,
					zIndex: 20,
					cursor: onWriteClick ? 'pointer' : 'default',
				}}
			/>
			
			{/* Dot 3 - hidden when hovered */}
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
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
		</>
	);
};

export const SentHeaderChrome: FC<{
	hasData?: boolean;
	onContactsClick?: () => void;
	onDraftsClick?: () => void;
	onInboxClick?: () => void;
}> = ({ hasData = true, onContactsClick, onDraftsClick, onInboxClick }) => {
	const [isDot1Hovered, setIsDot1Hovered] = useState(false);
	const [isDot2Hovered, setIsDot2Hovered] = useState(false);
	const [isDot3Hovered, setIsDot3Hovered] = useState(false);
	const wasAnyDotHoveredRef = useRef(false);
	
	// Sent tab positions (from existing inline code)
	const pillTop = 4;
	const pillHeight = 22;
	const pillWidth = 72;
	const pillBorderRadius = 11;
	const pillFontSize = '13px';
	const dotSize = 9;
	const dotTop = 11;
	
	// Dot positions from existing code
	const dot1Left = 36;  // First dot (Contacts)
	const dot2Left = 102; // Second dot (Drafts)
	const dot3Left = 235; // Third dot (Inbox)
	
	// Main Sent pill position
	const sentPillLeft = 137;
	
	// Contacts pill dimensions (shown when hovering dot 1)
	const contactsPillWidth = 82;
	const contactsPillHeight = pillHeight;
	const contactsPillBorderRadius = pillBorderRadius;
	const contactsPillFontSize = pillFontSize;
	const contactsPillLeft = 3; // Position near left edge
	
	// Drafts pill dimensions (shown when hovering dot 2)
	const draftsPillWidth = 72;
	const draftsPillHeight = pillHeight;
	const draftsPillBorderRadius = pillBorderRadius;
	const draftsPillFontSize = pillFontSize;
	const draftsPillLeft = 62; // Position between first dot area and Sent pill
	
	// Inbox pill dimensions (shown when hovering dot 3)
	const inboxPillWidth = 66;
	const inboxPillHeight = pillHeight;
	const inboxPillBorderRadius = pillBorderRadius;
	const inboxPillFontSize = pillFontSize;
	const inboxPillLeft = 208; // Position to the right of Sent pill
	
	const isAnyDotHovered = isDot1Hovered || isDot2Hovered || isDot3Hovered;
	const isSwitchingBetweenDots = wasAnyDotHoveredRef.current && isAnyDotHovered;
	const animatedTransition = '0.6s cubic-bezier(0.22, 1, 0.36, 1)';
	const instantTransition = '0s';
	const pillOpacityTransition = isSwitchingBetweenDots ? instantTransition : animatedTransition;
	
	useEffect(() => {
		wasAnyDotHoveredRef.current = isAnyDotHovered;
	}, [isAnyDotHovered]);
	
	const sentPillBgColor = hasData ? '#DBF6D4' : '#a2e1b7';
	const sentPillBorderColor = hasData ? '#19670F' : '#B0B0B0';
	const pillTextColor = hasData ? '#000000' : '#B0B0B0';
	const dotColor = hasData ? '#D9D9D9' : '#B0B0B0';
	
	// Hover zones
	const hoverZoneHeight = 30;
	const hoverZoneTop = dotTop + dotSize / 2 - hoverZoneHeight / 2;
	const dot1Center = dot1Left + dotSize / 2;
	const dot2Center = dot2Left + dotSize / 2;
	const dot3Center = dot3Left + dotSize / 2;
	const midpoint1to2 = (dot1Center + dot2Center) / 2;
	const midpoint2to3 = (dot2Center + dot3Center) / 2;
	
	// Zone 1: extends from before dot1 to midpoint between dot1 and dot2
	const hoverZone1Left = dot1Center - 30;
	const hoverZone1Width = midpoint1to2 - hoverZone1Left;
	
	// Zone 2: extends from midpoint1to2 to midpoint2to3
	const hoverZone2Left = midpoint1to2;
	const hoverZone2Width = midpoint2to3 - midpoint1to2;
	
	// Zone 3: extends from midpoint2to3 to after dot3
	const hoverZone3Left = midpoint2to3;
	const hoverZone3Width = dot3Center + 30 - midpoint2to3;
	
	// Sent pill position when hovered
	// Moves right when dot 1 is hovered (to make room for Contacts pill)
	// Moves right when dot 2 is hovered (to make room for Drafts pill)
	// Moves left when dot 3 is hovered (to make room for Inbox pill)
	const getSentPillLeft = () => {
		if (isDot1Hovered) return sentPillLeft + 18;
		if (isDot2Hovered) return sentPillLeft + 5;
		if (isDot3Hovered) return sentPillLeft - 5;
		return sentPillLeft;
	};
	
	return (
		<>
			{/* Sent pill - transforms to white pill and moves on hover */}
			<div
				data-campaign-shared-pill="campaign-tabs-pill"
				data-campaign-shared-pill-variant="sent"
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: `${getSentPillLeft()}px`,
					width: `${pillWidth}px`,
					height: `${pillHeight}px`,
					backgroundColor: isAnyDotHovered ? '#FFFFFF' : sentPillBgColor,
					border: isAnyDotHovered ? '2px solid #000000' : `2px solid ${sentPillBorderColor}`,
					borderRadius: `${pillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					transition: `left ${animatedTransition}, background-color ${animatedTransition}, border-color ${animatedTransition}`,
				}}
			>
				<span
					className="font-semibold font-inter leading-none"
					style={{ 
						color: pillTextColor, 
						fontSize: pillFontSize, 
						textAlign: 'center', 
						width: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
						opacity: isAnyDotHovered ? 0 : 1,
						transition: `opacity ${animatedTransition}`,
					}}
				>
					Sent
				</span>
			</div>

			{/* Contacts pill - shown when hovering dot 1 */}
			<div
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: `${contactsPillLeft}px`,
					width: `${contactsPillWidth}px`,
					height: `${contactsPillHeight}px`,
					backgroundColor: '#F5DADA',
					border: '2px solid #000000',
					borderRadius: `${contactsPillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					opacity: isDot1Hovered ? 1 : 0,
					pointerEvents: isDot1Hovered ? 'auto' : 'none',
					transition: `opacity ${pillOpacityTransition}`,
					cursor: onContactsClick ? 'pointer' : undefined,
				}}
				onClick={(e) => {
					e.stopPropagation();
					onContactsClick?.();
				}}
			>
				<span
					className="font-semibold font-inter leading-none"
					style={{ 
						color: '#000000', 
						fontSize: contactsPillFontSize, 
						textAlign: 'center', 
						width: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
					}}
				>
					Contacts
				</span>
			</div>

			{/* Drafts pill - shown when hovering dot 2 */}
			<div
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: `${draftsPillLeft}px`,
					width: `${draftsPillWidth}px`,
					height: `${draftsPillHeight}px`,
					backgroundColor: '#EFDAAF',
					border: '2px solid #000000',
					borderRadius: `${draftsPillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					opacity: isDot2Hovered ? 1 : 0,
					pointerEvents: isDot2Hovered ? 'auto' : 'none',
					transition: `opacity ${pillOpacityTransition}`,
					cursor: onDraftsClick ? 'pointer' : undefined,
				}}
				onClick={(e) => {
					e.stopPropagation();
					onDraftsClick?.();
				}}
			>
				<span
					className="font-semibold font-inter leading-none"
					style={{ 
						color: '#000000', 
						fontSize: draftsPillFontSize, 
						textAlign: 'center', 
						width: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
					}}
				>
					Drafts
				</span>
			</div>

			{/* Inbox pill - shown when hovering dot 3 */}
			<div
				style={{
					position: 'absolute',
					top: `${pillTop}px`,
					left: `${inboxPillLeft}px`,
					width: `${inboxPillWidth}px`,
					height: `${inboxPillHeight}px`,
					backgroundColor: '#CCDFF4',
					border: '2px solid #000000',
					borderRadius: `${inboxPillBorderRadius}px`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 10,
					opacity: isDot3Hovered ? 1 : 0,
					pointerEvents: isDot3Hovered ? 'auto' : 'none',
					transition: `opacity ${pillOpacityTransition}`,
					cursor: onInboxClick ? 'pointer' : undefined,
				}}
				onClick={(e) => {
					e.stopPropagation();
					onInboxClick?.();
				}}
			>
				<span
					className="font-semibold font-inter leading-none"
					style={{ 
						color: '#000000', 
						fontSize: inboxPillFontSize, 
						textAlign: 'center', 
						width: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
					}}
				>
					Inbox
				</span>
			</div>

			{/* Dot 1 - hidden when hovered */}
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
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

			{/* Dot 2 - hidden when hovered */}
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
					left: `${dot2Left}px`,
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: '50%',
					backgroundColor: dotColor,
					zIndex: 10,
					opacity: isDot2Hovered ? 0 : 1,
					transition: `opacity ${pillOpacityTransition}`,
				}}
			/>

			{/* Dot 3 - hidden when hovered */}
			<div
				style={{
					position: 'absolute',
					top: `${dotTop}px`,
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
		</>
	);
};

interface DraftingTableProps {
	handleClick: () => void;
	children: ReactNode;
	areAllSelected: boolean;
	hasData: boolean;
	noDataMessage: string;
	noDataDescription: string;
	isPending: boolean;
	title: string;
	/**
	 * Optional: marks this table as the "main box" for cross-tab morph animations.
	 * When provided, the wrapper will be tagged with `data-campaign-main-box`.
	 */
	mainBoxId?: string;
	footer?: ReactNode;
	topContent?: ReactNode;
	goToWriting?: () => void;
	goToContacts?: () => void;
	goToSearch?: () => void;
	goToDrafts?: () => void;
	goToSent?: () => void;
	goToInbox?: () => void;
	selectedCount?: number;
	/** Filter state for Drafts table */
	statusFilter?: 'all' | 'approved' | 'rejected';
	/** Callback to change status filter */
	onStatusFilterChange?: (filter: 'all' | 'approved' | 'rejected') => void;
	/** Count of approved drafts */
	approvedCount?: number;
	/** Count of rejected drafts */
	rejectedCount?: number;
	/** Total count of all drafts */
	totalDraftsCount?: number;
	/** Mobile mode flag */
	isMobile?: boolean | null;
	/**
	 * Contacts-only: controls the amount of reserved vertical space when `topContent` is provided.
	 * - default: assumes the mini search bar + selected row (existing layout)
	 * - compact: assumes only the selected row (no search bar)
	 */
	contactsTopContentVariant?: 'default' | 'compact';
}
export const DraftingTable: FC<DraftingTableProps> = ({
	title,
	handleClick,
	children,
	areAllSelected,
	hasData,
	noDataMessage,
	noDataDescription,
	isPending,
	mainBoxId,
	footer,
	topContent,
	goToWriting,
	goToContacts,
	goToSearch,
	goToDrafts,
	goToInbox,
	selectedCount = 0,
	statusFilter = 'all',
	onStatusFilterChange,
	approvedCount = 0,
	rejectedCount = 0,
	totalDraftsCount = 0,
	isMobile,
	contactsTopContentVariant = 'default',
}) => {
	const router = useRouter();
	const {
		setTopSearchHighlighted,
		setHomeButtonHighlighted,
		setDraftsTabHighlighted,
		setInboxTabHighlighted,
		setWriteTabHighlighted,
	} = useCampaignTopSearchHighlight();
	const [isDraftsCounterHovered, setIsDraftsCounterHovered] = useState(false);
	const [isApprovedCounterHovered, setIsApprovedCounterHovered] = useState(false);
	const [isRejectedCounterHovered, setIsRejectedCounterHovered] = useState(false);
	// Chrome-style hover preview for Drafts filter pills (All Drafts / Approved / Rejected)
	const [hoveredStatusFilterTab, setHoveredStatusFilterTab] = useState<
		'all' | 'approved' | 'rejected' | null
	>(null);
	const isContacts = title === 'Contacts';
	const isCompactHeader = isContacts || title === 'Drafts' || title === 'Sent';
	const showTitle = !isContacts && title !== 'Drafts' && title !== 'Sent';
	const isDrafts = title === 'Drafts';
	const isSent = title === 'Sent';

	// Safety: never leave the top search bar highlighted if this table unmounts mid-hover.
	useEffect(() => {
		return () => {
			setTopSearchHighlighted(false);
			setHomeButtonHighlighted(false);
			setDraftsTabHighlighted(false);
			setInboxTabHighlighted(false);
			setWriteTabHighlighted(false);
		};
	}, [
		setTopSearchHighlighted,
		setHomeButtonHighlighted,
		setDraftsTabHighlighted,
		setInboxTabHighlighted,
		setWriteTabHighlighted,
	]);

	// Mobile-responsive box dimensions
	const mobileBoxWidth = 'calc(100vw - 8px)'; // 4px margins on each side
	const mobileBoxHeight = 'calc(100dvh - 160px)';
	const boxWidth = isMobile ? mobileBoxWidth : (isContacts || isDrafts || isSent ? '499px' : '376px');
	const boxHeight = isMobile ? mobileBoxHeight : (isContacts || isDrafts || isSent ? '703px' : '474px');

	// Show skeleton while loading for Drafts table
	if (isDrafts && isPending) {
		return <DraftingTableSkeleton isMobile={isMobile} />;
	}

	return (
		<div
			data-campaign-main-box={mainBoxId}
			data-hover-description={
				isContacts
					? 'Select which contacts you want to send to.'
					: isDrafts
						? 'Drafts: review and select the emails you want to send.'
						: undefined
			}
			style={{ width: boxWidth, height: boxHeight, position: 'relative' }}
		>
			{/* Centered number above block */}
			<div
				data-drafting-top-number
				style={{
					position: 'absolute',
					top: '-26px',
					left: '50%',
					transform: 'translateX(-50%)',
					pointerEvents: 'none',
				}}
				className="text-[12px] font-inter font-medium text-black"
			>
				{isContacts ? '' : isDrafts ? '' : isSent ? '' : ''}
			</div>
			{/* New Contacts Pill - hidden on mobile */}
			{isContacts && !isMobile && (
				<ContactsHeaderChrome
					hasData={hasData}
					onWriteClick={goToWriting}
					onDraftsClick={goToDrafts}
					onInboxClick={goToInbox}
				/>
			)}

			{/* New Drafts Pill - hidden on mobile */}
			{isDrafts && !isMobile && (
				<DraftsHeaderChrome
					hasData={hasData}
					onContactsClick={goToContacts}
					onWriteClick={goToWriting}
					onInboxClick={goToInbox}
				/>
			)}

			{/* Counter in top right corner of Drafts table - hidden on approved/rejected tabs and on mobile */}
			{isDrafts && statusFilter === 'all' && !isMobile && (
				<div
					style={{
						position: 'absolute',
						top: '5px',
						right: '10px',
						zIndex: 10,
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
					}}
				>
					{/* Approved count */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
						<span className="font-bold text-[12px] text-black" style={{ fontFamily: 'Times New Roman, serif' }}>{approvedCount}</span>
						<ApproveCheckIcon width={12} height={9} className="text-black" />
					</div>
					{/* Rejected count */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
						<span className="font-bold text-[12px] text-black" style={{ fontFamily: 'Times New Roman, serif' }}>{rejectedCount}</span>
						<RejectXIcon width={10} height={10} className="text-black" />
					</div>
				</div>
			)}

			{/* New Sent Pill - hidden on mobile (use simpler header) */}
			{isSent && !isMobile && (
				<SentHeaderChrome
					hasData={hasData}
					onContactsClick={goToContacts}
					onDraftsClick={goToDrafts}
					onInboxClick={goToInbox}
				/>
			)}
			{/* Mobile Sent Header - hidden on mobile per user request */}

			{/* Filter tabs in gray section for Drafts - hidden on mobile */}
			{isDrafts && hasData && onStatusFilterChange && !isMobile && (
				<div
					onMouseLeave={() => setHoveredStatusFilterTab(null)}
					style={{
						position: 'absolute',
						top: '32px',
						left: 0,
						right: 0,
						zIndex: 10,
						display: 'flex',
						justifyContent: 'center',
					}}
				>
					<div style={{ display: 'flex', gap: '37px' }}>
						{(['all', 'approved', 'rejected'] as const).map((tab) => {
							const isActive = statusFilter === tab;
							const isAnyTabHovered = hoveredStatusFilterTab !== null;
							const isHovered = hoveredStatusFilterTab === tab;
							// When hovering, only the hovered tab should look "selected"
							const isVisuallyActive = isAnyTabHovered ? isHovered : isActive;
							const activeBackgroundColor =
								tab === 'approved'
									? '#559855'
									: tab === 'rejected'
										? '#A03C3C'
										: '#949494';
							const chromeTransition = '0.6s cubic-bezier(0.22, 1, 0.36, 1)';
							const labels: Record<typeof tab, string> = {
								all: 'All Drafts',
								approved: 'Approved',
								rejected: 'Rejected',
							};
							return (
								<button
									key={tab}
									type="button"
									style={{
										width: '62px',
										height: '17px',
										fontSize: '10px',
										fontWeight: 600,
										borderRadius: '6px',
										borderWidth: '1px',
										borderStyle: 'solid',
										borderColor: isAnyTabHovered ? '#000000' : 'transparent',
										backgroundColor: isVisuallyActive
											? activeBackgroundColor
											: isAnyTabHovered
												? '#FFFFFF'
												: '#D9D9D9',
										color: isVisuallyActive ? '#FFFFFF' : '#000000',
										cursor: 'pointer',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										padding: 0,
										boxSizing: 'border-box',
										transition: `background-color ${chromeTransition}, color ${chromeTransition}, border-color ${chromeTransition}`,
									}}
									onMouseEnter={() => setHoveredStatusFilterTab(tab)}
									onFocus={() => setHoveredStatusFilterTab(tab)}
									onBlur={() => setHoveredStatusFilterTab(null)}
									onClick={() => onStatusFilterChange(tab)}
								>
									<span
										style={{
											opacity: isAnyTabHovered && !isHovered ? 0 : 1,
											transition: `opacity ${chromeTransition}`,
										}}
									>
										{labels[tab]}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			)}


			{/* Top-left text label */}
			<div
				data-drafting-top-label
				style={{ position: 'absolute', top: '-20px', left: '2px', pointerEvents: 'none' }}
				className="text-[12px] font-inter font-medium text-black"
			>
				{isContacts ? '' : isDrafts ? '' : isSent ? '' : title}
			</div>
			{/* Container box with header */}
			<div
				data-drafting-table
				style={{
					width: '100%',
					height: '100%',
					border: isContacts
						? '3px solid #000000'
						: isDrafts
						? '3px solid #000000'
						: isSent
						? '3px solid #19670F'
						: '2px solid #ABABAB',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
				background: isContacts
					? isMobile
						? '#EB8586' // Solid pink on mobile (no white header)
						: hasData
						? 'linear-gradient(to bottom, #ffffff 26px, #EB8586 26px)'
						: '#FFAEAE'
					: isDrafts
					? isMobile
						? '#FFDC9E' // Solid orange on mobile (no white header or tabs)
						: hasData
						? 'linear-gradient(to bottom, #ffffff 26px, #E7E7E7 26px, #E7E7E7 55px, #FFDC9E 55px)'
						: '#F8D69A'
					: isSent
					? isMobile
						? '#5AB477' // Solid green on mobile (no white header)
						: hasData
						? 'linear-gradient(to bottom, #ffffff 26px, #5AB477 26px)'
						: '#a2e1b7'
					: 'white',
				}}
			>
				{/* Header section with top rounded corners */}
				<div
					data-drafting-table-header
					style={{
						borderTopLeftRadius: '8px',
						borderTopRightRadius: '8px',
						borderBottom: isCompactHeader ? 'none !important' : '2px solid #ABABAB',
						padding: isCompactHeader ? '0 10px' : '12px 16px',
						display: 'flex',
						justifyContent: isCompactHeader ? 'flex-end' : 'space-between',
						alignItems: 'center',
						height: isCompactHeader ? '20px' : '48px',
						backgroundColor: isContacts
							? 'transparent'
							: isDrafts
							? 'transparent'
							: isSent
							? 'transparent'
							: 'white',
					}}
				>
					{showTitle && (
						<div style={{ transform: 'translateY(-6px)' }}>
							<div className="text-sm font-inter font-medium text-black">{title}</div>
						</div>
					)}
					{hasData && !isSent && !(isContacts && topContent) && (
						<div
							style={{
								transform: isCompactHeader
									? isContacts
										? 'translateY(103px)'
										: isDrafts
										? 'translateY(57px)'
										: isSent
										? 'translateY(30px)'
										: 'translateY(-2px)'
									: 'translateY(6px)',
							}}
						>
							<Button
								type="button"
								variant="ghost"
								className="!h-[18px] text-xs font-inter font-medium text-black bg-none border-none cursor-pointer p-0 m-0 leading-none hover:underline transition-colors"
								onClick={handleClick}
							>
								{areAllSelected ? 'Deselect All' : 'Select All'}
							</Button>
						</div>
					)}
				</div>

				{/* Green section for Approved tab - hidden on mobile (no tabs) */}
				{isDrafts && hasData && statusFilter === 'approved' && !isMobile && (
					<div
						style={{
							position: 'absolute',
							top: '52px',
							left: 0,
							right: 0,
							height: '29px',
							backgroundColor: '#559855',
							zIndex: 9,
							display: 'grid',
							gridTemplateColumns: '1fr 1fr 1fr',
							alignItems: 'center',
							padding: '0 16px',
						}}
					>
						<div 
							style={{ 
								position: 'relative',
							}}
							onMouseEnter={() => setIsApprovedCounterHovered(true)}
							onMouseLeave={() => setIsApprovedCounterHovered(false)}
						>
							{isApprovedCounterHovered && (
								<div
									onClick={handleClick}
									style={{
										width: '15px',
										height: '15px',
										border: areAllSelected ? '2px solid #559855' : '2px solid #FFFFFF',
										borderRadius: '1px',
										backgroundColor: areAllSelected ? '#FFFFFF' : 'transparent',
										cursor: 'pointer',
									}}
								/>
							)}
							{!isApprovedCounterHovered && (
								<span className="text-[14px] font-inter font-medium text-white text-left">
									{approvedCount} Approved
								</span>
							)}
						</div>
						<span className="text-[14px] font-inter font-medium text-white text-center">
							{selectedCount} Selected
						</span>
						<button
							type="button"
							onClick={handleClick}
							className="text-[14px] font-inter font-medium text-white hover:underline bg-transparent border-none cursor-pointer text-right"
						>
							Select All
						</button>
					</div>
				)}

				{/* Red section for Rejected tab - hidden on mobile (no tabs) */}
				{isDrafts && hasData && statusFilter === 'rejected' && !isMobile && (
					<div
						style={{
							position: 'absolute',
							top: '52px',
							left: 0,
							right: 0,
							height: '29px',
							backgroundColor: '#A03C3C',
							zIndex: 9,
							display: 'grid',
							gridTemplateColumns: '1fr 1fr 1fr',
							alignItems: 'center',
							padding: '0 16px',
						}}
					>
						<div 
							style={{ 
								position: 'relative',
							}}
							onMouseEnter={() => setIsRejectedCounterHovered(true)}
							onMouseLeave={() => setIsRejectedCounterHovered(false)}
						>
							{isRejectedCounterHovered && (
								<div
									onClick={handleClick}
									style={{
										width: '15px',
										height: '15px',
										border: areAllSelected ? '2px solid #A03C3C' : '2px solid #FFFFFF',
										borderRadius: '1px',
										backgroundColor: areAllSelected ? '#FFFFFF' : 'transparent',
										cursor: 'pointer',
									}}
								/>
							)}
							{!isRejectedCounterHovered && (
								<span className="text-[14px] font-inter font-medium text-white text-left">
									{rejectedCount} Rejected
								</span>
							)}
						</div>
						<span className="text-[14px] font-inter font-medium text-white text-center">
							{selectedCount} Selected
						</span>
						<button
							type="button"
							onClick={handleClick}
							className="text-[14px] font-inter font-medium text-white hover:underline bg-transparent border-none cursor-pointer text-right"
						>
							Select All
						</button>
					</div>
				)}

				{/* Yellow section for All Drafts tab - hidden on mobile (no tabs header needed) */}
			{isDrafts && hasData && statusFilter === 'all' && !isMobile && (
				<div
					style={{
						position: 'absolute',
						top: '52px',
						left: 0,
						right: 0,
						height: '29px',
						backgroundColor: '#FFDC9E',
						zIndex: 9,
						display: 'grid',
						gridTemplateColumns: '1fr 1fr 1fr',
						alignItems: 'center',
						padding: '0 16px',
					}}
				>
					<div 
						style={{ 
							position: 'relative',
							transition: 'none !important',
							animation: 'none !important',
						}}
						onMouseEnter={() => setIsDraftsCounterHovered(true)}
						onMouseLeave={() => setIsDraftsCounterHovered(false)}
					>
						{isDraftsCounterHovered && (
							<div
								onClick={handleClick}
								style={{
									width: '15px',
									height: '15px',
									border: areAllSelected ? '2px solid #FFFFFF' : '2px solid #000000',
									borderRadius: '1px',
									backgroundColor: areAllSelected ? '#000000' : 'transparent',
									cursor: 'pointer',
								}}
							/>
						)}
						{!isDraftsCounterHovered && (
							<span 
								className="text-[14px] font-inter font-medium text-black text-left"
							>
								{totalDraftsCount} Drafts
							</span>
						)}
					</div>
						<span className="text-[14px] font-inter font-medium text-black text-center">
							{selectedCount} Selected
						</span>
						<button
							type="button"
							onClick={handleClick}
							className="text-[14px] font-inter font-medium text-black hover:underline bg-transparent border-none cursor-pointer text-right"
						>
							Select All
						</button>
					</div>
				)}

				{/* Top content area (e.g., mini searchbar for contacts) */}
				{isContacts && topContent && hasData && (
					<div
						style={{
							position: 'absolute',
							top: '35px',
							left: 0,
							right: 0,
							zIndex: 5,
						}}
					>
						{topContent}
					</div>
				)}

				{/* Content area */}
				<CustomScrollbar
					className="flex-1 drafting-table-content"
					style={{
					marginTop:
						isContacts && isMobile
							? '8px' // Minimal margin on mobile (no white header)
							: isContacts && topContent && hasData
							? contactsTopContentVariant === 'compact'
								? '45px'
								: '115px'
							: isContacts && hasData
							? '105px'
							: isContacts
							? '68px'
							: isDrafts
							? (isMobile ? '8px' : hasData ? '66px' : '32px') // 66px with data (tabs shown), 32px when empty (no tabs)
							: isSent
							? (isMobile ? '8px' : '32px') // Minimal margin on mobile (no white header)
							: 0,
					}}
					thumbWidth={2}
					thumbColor="#000000"
					trackColor="transparent"
					offsetRight={-6}
				>
					{isPending ? (
						isContacts && !hasData ? (
							(() => {
								// Match the "flowing" wave feel used elsewhere (staggered delays).
								const durationSeconds = 6;
								const stepDelaySeconds = 0.1;
								const rows = isMobile ? 8 : 12;
								const rowWidthClass = isMobile ? 'w-full' : 'w-[489px]';
								return (
									<div
										className="overflow-visible w-full flex flex-col items-center"
										style={{
											gap: isMobile ? '8px' : '16px',
											padding: isMobile ? '0 8px' : undefined,
										}}
										aria-hidden="true"
									>
										{Array.from({ length: rows }).map((_, idx) => (
											<div
												key={`contacts-loading-wave-${idx}`}
												className={`select-none ${rowWidthClass} h-[52px] overflow-hidden rounded-[8px] border-2 border-[#000000] contacts-expanded-list-loading-wave-row`}
												style={{
													animationDelay: `${-(durationSeconds - idx * stepDelaySeconds)}s`,
												}}
											/>
										))}
									</div>
								);
							})()
						) : (
							<div className="flex items-center justify-center h-full">
								<Spinner size="small" />
							</div>
						)
					) : hasData ? (
						children
					) : isDrafts || isSent ? (
					<div
						className="overflow-visible w-full flex flex-col items-center"
						style={{ gap: '10px', padding: isMobile ? '0 8px' : undefined }}
					>
						{Array.from({ length: isMobile ? 5 : 8 }).map((_, idx) => {
							// For drafts/sent empty state: boxes 2-5 (idx 1-4) are 52px, all others are 85px
							// On mobile: boxes are slightly taller (58px vs 52px, 90px vs 85px)
							const placeholderBoxHeight =
								(isDrafts || isSent) && idx >= 1 && idx <= 4 
									? (isMobile ? 'h-[58px]' : 'h-[52px]') 
									: (isMobile ? 'h-[90px]' : 'h-[85px]');
							const boxBgColor = isDrafts
								? idx === 1
									? 'bg-[#FFCF79]'
									: idx === 2
									? 'bg-[#FFD487]'
									: idx === 3
									? 'bg-[#FFD892]'
									: idx === 4
									? 'bg-[#FFDA97]'
									: 'bg-[#FFCD73]'
								: isSent
								? idx === 1
									? 'bg-[#52CD7A]'
									: idx === 2
									? 'bg-[#63D286]'
									: idx === 3
									? 'bg-[#79dc99]'
									: idx === 4
									? 'bg-[#96e7b0]'
									: 'bg-[#53c076]'
								: 'bg-white';
							const placeholderBoxWidth = isMobile ? 'w-full' : 'w-[489px]';
							const innerButtonWidth = isMobile ? 'calc(100% - 24px)' : '376px';
							return (
								<div
									key={idx}
									className={`select-none ${placeholderBoxWidth} ${placeholderBoxHeight} overflow-hidden rounded-[8px] border-2 border-[#000000] ${boxBgColor} p-2 flex items-center justify-center`}
								>
									{isDrafts && idx === 0 && (
										<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[14px]' : 'text-[15px]'}`}>
											Draft Your First Email
										</span>
									)}
									{isSent && idx === 0 && (
										<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[14px]' : 'text-[15px]'}`}>
											Send Your First Message
										</span>
									)}
									{isDrafts && idx === 1 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-[#A6E2A8] transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={goToWriting}
											onMouseEnter={() => setWriteTabHighlighted(true)}
											onMouseLeave={() => setWriteTabHighlighted(false)}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Write Your Emails
											</span>
										</div>
									)}
									{isDrafts && idx === 2 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-[#AFD6EF] transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={goToSearch}
											onMouseEnter={() => setTopSearchHighlighted(true)}
											onMouseLeave={() => setTopSearchHighlighted(false)}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Search For More Contacts
											</span>
										</div>
									)}
									{isDrafts && idx === 3 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-[#84B9F5] transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={goToInbox}
											onMouseEnter={() => setInboxTabHighlighted(true)}
											onMouseLeave={() => setInboxTabHighlighted(false)}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Check Inbox
											</span>
										</div>
									)}
									{isDrafts && idx === 4 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-[#DBDBDB] transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={() => router.push(urls.murmur.dashboard.index)}
											onMouseEnter={() => setHomeButtonHighlighted(true)}
											onMouseLeave={() => setHomeButtonHighlighted(false)}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Create New Campaign
											</span>
										</div>
									)}
									{isSent && idx === 1 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-[#EFDAAF] transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={goToDrafts}
											onMouseEnter={() => setDraftsTabHighlighted(true)}
											onMouseLeave={() => setDraftsTabHighlighted(false)}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Review and Send Drafts
											</span>
										</div>
									)}
									{isSent && idx === 2 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-[#A6E2A8] transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={goToWriting}
											onMouseEnter={() => setWriteTabHighlighted(true)}
											onMouseLeave={() => setWriteTabHighlighted(false)}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Write More Emails
											</span>
										</div>
									)}
									{isSent && idx === 3 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-[#AFD6EF] transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={goToSearch}
											onMouseEnter={() => setTopSearchHighlighted(true)}
											onMouseLeave={() => setTopSearchHighlighted(false)}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Add More Contacts
											</span>
										</div>
									)}
									{isSent && idx === 4 && (
										<div
											className="bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer hover:bg-[#DBDBDB] transition-colors"
											style={{ width: innerButtonWidth, height: isMobile ? '44px' : '42px' }}
											onClick={() => router.push(urls.murmur.dashboard.index)}
											onMouseEnter={() => setHomeButtonHighlighted(true)}
											onMouseLeave={() => setHomeButtonHighlighted(false)}
										>
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[12px]' : 'text-[15px]'}`}>
												Create New Campaign
											</span>
										</div>
									)}
								</div>
							);
						})}
					</div>
					) : isContacts ? (
						<div
							className="overflow-visible w-full flex flex-col items-center pb-2"
							style={{ gap: isMobile ? '10px' : '11px', padding: isMobile ? '0 8px' : undefined }}
						>
							{Array.from({ length: isMobile ? 5 : 9 }).map((_, idx) => {
								const contactsPlaceholderBoxWidth = isMobile ? 'w-full' : 'w-[459px]';
								const contactsPlaceholderBoxHeight = isMobile 
									? (idx === 0 ? 'h-[90px]' : 'h-[58px]')
									: 'h-[52px]';
								const contactsInnerButtonWidth = isMobile ? 'calc(100% - 24px)' : '403px';
								return (
									<div
										key={idx}
										className={`select-none ${contactsPlaceholderBoxWidth} ${contactsPlaceholderBoxHeight} overflow-hidden rounded-[8px] border-2 border-[#000000] flex items-center justify-center ${
											idx === 0
												? 'bg-[#E54D50]'
												: idx === 2
												? 'bg-[#E72528]'
												: idx === 3
												? 'bg-[#E85052]'
												: idx === 4
												? 'bg-[#F87C7D]'
												: idx === 5
												? 'bg-[#EB8586]'
												: 'bg-[#E15E60]'
										}`}
									>
										{idx === 0 && (
											<span className={`font-semibold font-inter text-black ${isMobile ? 'text-[14px]' : 'text-[15px]'}`}>
												All Contacts Drafted
											</span>
										)}
										{isMobile ? (
											idx >= 1 && idx <= 4 && (
												(() => {
													const isAddMoreContacts = idx === 1;
													const isSendDrafts = idx === 2;
													const isCheckInbox = idx === 3;
													const isCreateNewCampaign = idx === 4;
													return (
												<div
													className={`bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer transition-colors ${
														isAddMoreContacts
															? 'hover:bg-[#AFD6EF]'
															: isSendDrafts
																? 'hover:bg-[#EFDAAF]'
																: isCheckInbox
																	? 'hover:bg-[#84B9F5]'
																	: isCreateNewCampaign
																		? 'hover:bg-[#DBDBDB]'
																: 'hover:bg-gray-50'
													}`}
													style={{ width: contactsInnerButtonWidth, height: '44px' }}
													onMouseEnter={
														isAddMoreContacts
															? () => setTopSearchHighlighted(true)
															: isSendDrafts
																? () => setDraftsTabHighlighted(true)
																: isCheckInbox
																	? () => setInboxTabHighlighted(true)
																	: isCreateNewCampaign
																		? () => setHomeButtonHighlighted(true)
																: undefined
													}
													onMouseLeave={
														isAddMoreContacts
															? () => setTopSearchHighlighted(false)
															: isSendDrafts
																? () => setDraftsTabHighlighted(false)
																: isCheckInbox
																	? () => setInboxTabHighlighted(false)
																	: isCreateNewCampaign
																		? () => setHomeButtonHighlighted(false)
																: undefined
													}
													onClick={() => {
														if (idx === 1) goToSearch?.();
														if (idx === 2) goToDrafts?.();
														if (idx === 3) goToInbox?.();
														if (idx === 4) router.push(urls.murmur.dashboard.index);
													}}
												>
													<span className="text-[12px] font-semibold font-inter text-black">
														{idx === 1 && 'Add More Contacts'}
														{idx === 2 && 'Send Drafts'}
														{idx === 3 && 'Check Inbox'}
														{idx === 4 && 'Create New Campaign'}
													</span>
												</div>
													);
												})()
											)
										) : (
											idx >= 2 && idx <= 5 && (
												(() => {
													const isAddMoreContacts = idx === 2;
													const isSendDrafts = idx === 3;
													const isCheckInbox = idx === 4;
													const isCreateNewCampaign = idx === 5;
													return (
												<div
													className={`bg-white rounded-[8px] border-2 border-[#000000] flex items-center justify-center cursor-pointer transition-colors ${
														isAddMoreContacts
															? 'hover:bg-[#AFD6EF]'
															: isSendDrafts
																? 'hover:bg-[#EFDAAF]'
																: isCheckInbox
																	? 'hover:bg-[#84B9F5]'
																	: isCreateNewCampaign
																		? 'hover:bg-[#DBDBDB]'
																: 'hover:bg-gray-50'
													}`}
													style={{ width: contactsInnerButtonWidth, height: '42px' }}
													onMouseEnter={
														isAddMoreContacts
															? () => setTopSearchHighlighted(true)
															: isSendDrafts
																? () => setDraftsTabHighlighted(true)
																: isCheckInbox
																	? () => setInboxTabHighlighted(true)
																	: isCreateNewCampaign
																		? () => setHomeButtonHighlighted(true)
																: undefined
													}
													onMouseLeave={
														isAddMoreContacts
															? () => setTopSearchHighlighted(false)
															: isSendDrafts
																? () => setDraftsTabHighlighted(false)
																: isCheckInbox
																	? () => setInboxTabHighlighted(false)
																	: isCreateNewCampaign
																		? () => setHomeButtonHighlighted(false)
																: undefined
													}
													onClick={() => {
														if (idx === 2) goToSearch?.();
														if (idx === 3) goToDrafts?.();
														if (idx === 4) goToInbox?.();
														if (idx === 5) router.push(urls.murmur.dashboard.index);
													}}
												>
													<span className="text-[15px] font-semibold font-inter text-black">
														{idx === 2 && 'Add More Contacts'}
														{idx === 3 && 'Send Drafts'}
														{idx === 4 && 'Check Inbox'}
														{idx === 5 && 'Create New Campaign'}
													</span>
												</div>
													);
												})()
											)
										)}
									</div>
								);
							})}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
							<div className="text-sm font-semibold mb-2">{noDataMessage}</div>
							<div className="text-xs text-center">{noDataDescription}</div>
						</div>
					)}
				</CustomScrollbar>

				{/* Optional footer area (e.g., Send button for Drafts) */}
				{footer && (
					<div
						data-drafting-table-footer
						style={{
							padding: isDrafts ? '6px 5px' : isCompactHeader ? '6px 16px' : '12px 16px',
							backgroundColor: isContacts
								? '#EB8586'
								: isDrafts
								? '#FFDC9E'
								: isSent
								? '#5AB477'
								: 'white',
						}}
					>
						{footer}
					</div>
				)}
			</div>
		</div>
	);
};
