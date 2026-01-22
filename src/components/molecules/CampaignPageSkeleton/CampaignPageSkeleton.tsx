'use client';

import { FC, useRef } from 'react';
import { cn } from '@/utils';
import { type CampaignViewType, useCampaignDevice } from '@/contexts/CampaignDeviceContext';
import { setCampaignLoadingWaveStartNow } from '@/utils/campaignLoadingWave';

/**
 * Skeleton loader for the campaign page that matches the exact dimensions
 * of the HybridPromptInput, ContactsExpandedList, and ContactResearchPanel components.
 */
export const CampaignPageSkeleton: FC = () => {
	// Establish a shared wave "start" timestamp so when the real components mount
	// (ContactsExpandedList / ContactResearchPanel) their wave phase can continue seamlessly.
	const didInitWaveRef = useRef(false);
	if (!didInitWaveRef.current) {
		setCampaignLoadingWaveStartNow();
		didInitWaveRef.current = true;
	}

	const { isMobile, activeView } = useCampaignDevice();
	// Mobile has no Writing tab — never show the HybridPromptInput skeleton there.
	// Treat "unknown" as mobile-safe to avoid flashing the Write skeleton during hydration.
	const shouldRenderMobileSkeleton = isMobile !== false;

	if (shouldRenderMobileSkeleton) {
		return <CampaignPageMobileSkeleton view={activeView} />;
	}

	return (
		<div className="flex flex-col items-center pt-1">
			{/* Top row: matches DraftingSection "Write" tab geometry */}
			<div className="flex justify-center gap-[32px]">
				{/* Left side: CampaignHeaderBox + ContactsExpandedList skeleton */}
				<div className="hidden xl:block pt-[29px]">
					<div className="flex flex-col" style={{ gap: '16px' }}>
						<CampaignHeaderBoxSkeleton />
						<ContactsExpandedListSkeleton />
					</div>
				</div>

				{/* Center: HybridPromptInput (Writing Box) skeleton */}
				<HybridPromptInputSkeleton />

				{/* Right side: ContactResearchPanel skeleton */}
				<div className="hidden xl:block pt-[29px]">
					<ContactResearchPanelSkeleton />
				</div>
			</div>

			{/* Bottom panels anchor (critical):
			    Campaign zoom is clamped using `[data-campaign-bottom-anchor]`.
			    Without this, the skeleton can render at a different zoom than the real DraftingSection,
			    making the writing skeleton appear larger/smaller right as the page finishes loading. */}
			<CampaignBottomPanelsSkeleton />
		</div>
	);
};

/**
 * Mobile campaign loading skeleton.
 * Mobile does not expose the Writing tab, so we show a neutral "list box" placeholder
 * that fits the mobile tabbed layout (Contacts/Drafts/Sent/Inbox).
 */
const CampaignPageMobileSkeleton: FC<{ view: CampaignViewType | null }> = ({ view }) => {
	// If the user is landing directly on Inbox, match the inbox skeleton 1:1.
	if (view === 'inbox') {
		return <CampaignPageMobileInboxSkeleton activeTab="inbox" />;
	}

	// Fallback: a neutral list-style skeleton for other mobile views.
	return <CampaignPageMobileListSkeleton />;
};

const CampaignPageMobileInboxSkeleton: FC<{ activeTab: 'inbox' | 'sent' }> = ({
	activeTab,
}) => {
	const skeletonRowCount = 5;
	const mobileBoxWidth = 'calc(100vw - 8px)'; // 4px margins on each side
	const mobileSearchBarWidth = 'calc(100% - 124px)'; // matches InboxSection mobile sizing
	const mobileEmailRowWidth = '100%';

	return (
		<div className="w-full flex justify-center px-1">
			<div
				data-campaign-main-box="inbox"
				className="mt-6 flex flex-col items-center space-y-2 overflow-y-auto overflow-x-hidden relative animate-pulse"
				style={{
					width: mobileBoxWidth,
					height: 'calc(100dvh - 160px)',
					border: '3px solid #000000',
					borderRadius: '8px',
					padding: '8px',
					paddingTop: '62px',
					background: activeTab === 'sent' ? '#5AB477' : '#6fa4e1',
				}}
				role="status"
				aria-busy="true"
				aria-label="Loading emails"
			>
				<span className="sr-only">Loading emails…</span>

				{/* Search bar skeleton (matches InboxSection mobile) */}
				<div
					style={{
						position: 'absolute',
						top: '12px',
						left: '8px',
						width: mobileSearchBarWidth,
						height: '42px',
						border: '3px solid #000000',
						borderRadius: '8px',
						backgroundColor: '#FFFFFF',
						zIndex: 10,
						display: 'flex',
						alignItems: 'center',
						paddingLeft: '12px',
						gap: '10px',
						pointerEvents: 'none',
					}}
					aria-hidden
				>
					<div className="h-[14px] w-[14px] rounded bg-[#D9D9D9]" />
					<div className="h-[14px] flex-1 rounded bg-[#E5E5E5]" />
				</div>

				{/* Inbox/Sent toggle skeleton (matches InboxSection mobile) */}
				<div
					style={{
						position: 'absolute',
						top: '12.5px',
						right: '8px',
						width: '100px',
						height: '40px',
						border: '3px solid #000000',
						borderRadius: '8px',
						backgroundColor: '#FFFFFF',
						zIndex: 10,
						display: 'flex',
						alignItems: 'center',
						padding: '3px',
						gap: '2px',
						pointerEvents: 'none',
					}}
					aria-hidden
				>
					<div
						className="rounded-[8px] bg-[#E5E5E5]"
						style={{ width: '46px', height: '16px' }}
					/>
					<div
						className="rounded-[8px] bg-[#E5E5E5]"
						style={{ width: '46px', height: '16px' }}
					/>
				</div>

				{/* Email rows skeleton (matches InboxSection mobile) */}
				{Array.from({ length: skeletonRowCount }).map((_, idx) => (
					<div
						key={`campaign-inbox-loading-${idx}`}
						className="bg-white px-4 flex items-center w-full max-[480px]:px-2"
						style={{
							width: mobileEmailRowWidth,
							height: '100px',
							minHeight: '100px',
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: '#FFFFFF',
						}}
					>
						<div className="flex flex-col w-full">
							<div className="flex items-center justify-between gap-3">
								<div className="h-[14px] rounded bg-[#D9D9D9]" style={{ width: '55%' }} />
								<div className="h-[14px] rounded bg-[#D9D9D9]" style={{ width: '60px' }} />
							</div>
							<div className="mt-2 h-[12px] rounded bg-[#E5E5E5]" style={{ width: '85%' }} />
							<div className="mt-2 h-[10px] rounded bg-[#E5E5E5]" style={{ width: '70%' }} />
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

const CampaignPageMobileListSkeleton: FC = () => {
	return (
		<div className="w-full flex justify-center px-1">
			<div
				className={cn(
					'mt-6',
					'rounded-[8px] border-[3px] border-black',
					'flex flex-col overflow-hidden',
					'animate-pulse'
				)}
				style={{
					width: 'calc(100vw - 8px)',
					height: 'calc(100dvh - 160px)',
					backgroundColor: '#E8EFFF',
				}}
			>
				{/* Top controls */}
				<div className="w-full h-[62px] px-2 py-2">
					<div className="w-full h-[42px] bg-white border-[3px] border-black rounded-[8px]" />
				</div>

				{/* Rows */}
				<div className="flex-1 flex flex-col items-center px-2 space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={`campaign-mobile-row-${i}`}
							className="w-full bg-white border-[3px] border-black rounded-[8px]"
							style={{ height: '100px' }}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

/**
 * Skeleton for the HybridPromptInput writing box.
 * Dimensions: width 96.27vw max 499px, height 703px
 */
export const HybridPromptInputSkeleton: FC = () => {
	return (
		<div
			className={cn(
				'w-[96.27vw] max-w-[499px] h-[703px]',
				'border-[3px] border-black rounded-[8px]',
				'flex flex-col overflow-hidden',
				'animate-pulse'
			)}
			style={{ backgroundColor: '#A6E2A8' }}
		>
			{/* Writing header bar */}
			<div className="w-full h-[22px] border-b-[2px] border-black flex items-center px-[9px] bg-white rounded-t-[calc(0.375rem-3px)]" />

			{/* Mode section */}
			<div className="bg-white">
				<div className="h-[40px] flex items-center px-[8px]" />
				<div className="w-full border-b-[2px] border-black" />
			</div>

			{/* Subject bar skeleton */}
			<div className="flex flex-col items-center pt-[20px]">
				<div
					className={cn(
						'w-[89.33vw] max-w-[475px] h-[31px]',
						'rounded-[8px] border-2 border-black',
						'flex items-center overflow-hidden bg-white'
					)}
				>
					<div className="pl-2 w-[120px] h-full flex items-center bg-white" />
					<div className="w-[60px] h-full bg-[#5dab68] flex items-center justify-center" />
					<div className="flex-grow h-full bg-white" />
				</div>
			</div>

			{/* Full Auto block skeleton */}
			<div className="pt-[20px] px-3 flex flex-col items-center flex-1">
				<div
					className={cn(
						'w-[89.33vw] max-w-[475px]',
						'border-2 border-[#51A2E4] rounded-md bg-white'
					)}
				>
					{/* Full Auto header */}
					<div className="w-full h-[29px] bg-[#B9DAF5] flex items-center pl-[16px]">
						<div className="flex-1" />
						<div className="flex items-center gap-[1px]">
							<div className="w-[1px] h-full bg-[#51A2E4]" />
							<div className="w-[101px] h-full bg-[#8DBFE8] flex items-center justify-center" />
							<div className="w-[1px] h-full bg-black" />
							<div className="w-[46px] h-full flex items-center justify-center" />
							<div className="w-[1px] h-full bg-[#51A2E4]" />
							<div className="w-[31px]" />
						</div>
					</div>

					{/* Divider */}
					<div className="w-full h-[1px] bg-[#51A2E4]" />

					{/* Content area */}
					<div className="p-4 h-[115px]" />

					{/* Bottom gray bar */}
					<div className="w-full h-[35px] bg-[#F5F5F5] flex items-center gap-[6px] px-[15px]">
						<div className="w-[115px] h-[20px] bg-[#D7F0FF] border-2 border-black rounded-[5px]" />
						<div className="w-[73px] h-[20px] bg-[#D7F0FF] border-2 border-black rounded-[5px]" />
					</div>
				</div>
			</div>

			{/* Signature skeleton */}
			<div className="flex flex-col items-center mt-auto pb-[23px]">
				<div
					className={cn(
						'w-[89.33vw] max-w-[475px] min-h-[57px]',
						'border-2 border-gray-400 rounded-md bg-white px-4 py-2'
					)}
				/>
			</div>

			{/* Generate Test button area */}
			<div className="w-full max-[480px]:hidden">
				<div className="w-full h-[2px] bg-black" />
				<div className="w-full h-[41px] flex items-center justify-center bg-white rounded-b-[calc(0.375rem-3px)]">
					<div
						className={cn(
							'w-[93.7vw] max-w-[475px] h-[28px]',
							'bg-white border-[3px] border-[#349A37] rounded-[4px]',
							'flex items-center justify-center'
						)}
					/>
				</div>
			</div>
		</div>
	);
};

/**
 * Skeleton for the bottom 3-box strip (Drafts/Sent/Inbox) used by the campaign zoom clamp.
 * This is intentionally lightweight and primarily exists to provide a stable
 * `[data-campaign-bottom-anchor]` while DraftingSection is dynamically loading.
 *
 * Note: DraftingSection initially renders these panels at 117px height (collapsed state,
 * when applicable, is applied later via an effect). Matching that initial geometry prevents
 * a zoom re-clamp on load that can visually "shrink" the writing panel after the skeleton.
 */
const CampaignBottomPanelsSkeleton: FC = () => {
	const panelW = 233;
	const panelH = 117;
	const border = '3px solid #000000';
	const radius = '8px';

	return (
		<div
			// Keep this in the DOM to preserve the zoom clamp geometry (measured via getBoundingClientRect),
			// but hide it so the loading animation doesn't show the bottom panel boxes.
			className="mt-[35px] pb-[8px] flex justify-center gap-[15px] invisible"
			data-campaign-bottom-anchor
			aria-hidden
		>
			<div
				className="animate-pulse"
				style={{
					width: `${panelW}px`,
					height: `${panelH}px`,
					border,
					borderRadius: radius,
					backgroundColor: '#FFE3AA', // drafts-ish
				}}
			/>
			<div
				className="animate-pulse"
				style={{
					width: `${panelW}px`,
					height: `${panelH}px`,
					border,
					borderRadius: radius,
					backgroundColor: '#A6E2A8', // sent-ish
				}}
			/>
			<div
				className="animate-pulse"
				style={{
					width: `${panelW}px`,
					height: `${panelH}px`,
					border,
					borderRadius: radius,
					backgroundColor: '#D8E5FB', // inbox-ish
				}}
			/>
		</div>
	);
};

/**
 * Skeleton for the CampaignHeaderBox.
 * Dimensions: 375px x 71px
 */
export const CampaignHeaderBoxSkeleton: FC = () => {
	return (
		<div
			className={cn(
				'bg-white border-[2px] border-black rounded-[8px]',
				'flex flex-col px-3 pt-0 pb-2 box-border',
				'animate-pulse'
			)}
			style={{
				width: '375px',
				height: '71px',
				minHeight: '71px',
				maxHeight: '71px',
			}}
		>
			{/* Campaign Title area */}
			<div className="h-[26px] overflow-hidden flex-shrink-0" />

			{/* Spacer */}
			<div className="flex-1" />

			{/* To/From Row */}
			<div className="flex items-center text-[11px] flex-shrink-0">
				{/* To section */}
				<div className="flex items-center gap-1 w-1/2">
					<div
						className="flex items-center justify-center rounded-[5px] border border-black"
						style={{
							width: '22px',
							height: '14px',
							backgroundColor: '#F5DADA',
						}}
					/>
				</div>
				{/* From section */}
				<div className="flex items-center gap-1 w-1/2">
					<div
						className="flex items-center justify-center rounded-[5px] border border-black"
						style={{
							width: '31px',
							height: '14px',
							backgroundColor: '#E8EFFF',
						}}
					/>
				</div>
			</div>

			{/* Metrics Row */}
			<div className="flex items-center gap-2 mt-1 flex-shrink-0">
				<div
					className="rounded-full border border-black"
					style={{
						width: '70px',
						height: '16px',
						backgroundColor: '#F5DADA',
					}}
				/>
				<div
					className="rounded-full border border-black"
					style={{
						width: '60px',
						height: '16px',
						backgroundColor: '#FFE3AA',
					}}
				/>
				<div
					className="rounded-full border border-black"
					style={{
						width: '50px',
						height: '16px',
						backgroundColor: '#B0E0A6',
					}}
				/>
			</div>
		</div>
	);
};

/**
 * Skeleton for the ContactsExpandedList.
 * Dimensions: 375px x 557px
 */
export const ContactsExpandedListSkeleton: FC = () => {
	// Keep timing aligned with the real ContactsExpandedList loading wave.
	// (CSS animation is 4.5s; we use this only to stagger start delays per row.)
	const loadingWaveDurationSeconds = 4.5;
	const loadingWaveStepSeconds = 0.1;
	const rowCount = 8;

	return (
		<div
			className={cn(
				// Match ContactsExpandedList container chrome as closely as possible to avoid
				// a visual "flip" when the real component mounts.
				'relative rounded-md flex flex-col overflow-visible',
				'border border-black'
			)}
			style={{
				width: '375px',
				height: '557px',
				background: 'linear-gradient(to bottom, #ffffff 28px, #EB8586 28px)',
			}}
		>
			{/* Header */}
			<div className="h-[28px] flex items-center px-3" />

			{/* Selection info */}
			<div className="px-3 mt-1 mb-0 flex items-center justify-center h-[20px]" />

			{/* Contact rows skeleton */}
			<div className="flex-1 flex flex-col items-center pt-2 pb-2 space-y-2 px-2">
				{Array.from({ length: rowCount }).map((_, i) => (
					<div
						key={i}
						className={cn(
							// Match ContactsExpandedList innerWidth for width={375} (375 - 10 = 365)
							'w-[365px] h-[49px]',
							'rounded-[8px] border-2 border-black overflow-hidden',
							'contacts-expanded-list-loading-wave-row'
						)}
						style={{
							animationDelay: `${-(loadingWaveDurationSeconds - i * loadingWaveStepSeconds)}s`,
						}}
					/>
				))}
			</div>
		</div>
	);
};

/**
 * Skeleton for the ContactResearchPanel.
 * Dimensions: 375px width, ~540px height
 */
export const ContactResearchPanelSkeleton: FC = () => {
	const headerHeight = 24;
	const boxWidth = 360;
	const containerWidth = 375;
	const innerBoxWidth = boxWidth - 41; // 319
	const identityTop = headerHeight + 6;
	const identityHeight = 51;
	const bulletCount = 3;
	const bulletOuterHeight = 52;
	const bulletSpacing = 65;
	const firstBulletTop = identityTop + identityHeight + 10;

	// Match the live loader timing so the skeleton and real panel feel identical.
	const loadingWaveDurationSeconds = 6;
	const loadingWaveStepDelaySeconds = 0.1;
	const waveDelayForIndex = (idx: number) =>
		`${-(loadingWaveDurationSeconds - idx * loadingWaveStepDelaySeconds)}s`;

	return (
		<div
			className={cn(
				'relative rounded-[7px]',
				'border-[3px] border-black'
			)}
			style={{
				width: `${containerWidth}px`,
				height: '540px',
				backgroundColor: '#D8E5FB',
			}}
		>
			{/* Header background bar */}
			<div
				className={cn(
					"absolute top-0 left-0 w-full rounded-t-[5px]",
					"research-panel-loading-wave-box"
				)}
				style={{
					height: `${headerHeight}px`,
					animationDelay: waveDelayForIndex(0),
				}}
			/>

			{/* Title skeleton - empty placeholder */}
			<div
				className="absolute left-[16px] -translate-y-1/2 z-10"
				style={{ top: `${headerHeight / 2}px` }}
			/>

			{/* Divider under header */}
			<div
				className="absolute left-0 w-full bg-black z-10"
				style={{
					top: `${headerHeight}px`,
					height: '2px',
				}}
			/>

			{/* Identity box */}
			<div
				className={cn(
					"absolute border-2 border-black rounded-[10px] overflow-hidden",
					"research-panel-loading-wave-box"
				)}
				style={{
					top: `${identityTop}px`,
					left: '50%',
					transform: 'translateX(-50%)',
					width: `${boxWidth - 1}px`,
					height: `${identityHeight}px`,
					animationDelay: waveDelayForIndex(1),
				}}
			/>

			{/* Bullet boxes skeleton (3 max while loading) */}
			{Array.from({ length: bulletCount }).map((_, idx) => {
				const key = String(idx + 1);
				const top = firstBulletTop + idx * bulletSpacing;
				const waveIndex = 2 + idx;

				return (
				<div
					key={key}
					className={cn("absolute", "research-panel-loading-wave-box")}
					style={{
						top: `${top}px`,
						left: '50%',
						transform: 'translateX(-50%)',
						width: `${boxWidth}px`,
						height: `${bulletOuterHeight}px`,
						border: '2px solid #000000',
						borderRadius: '8px',
						animationDelay: waveDelayForIndex(waveIndex),
					}}
				>
					{/* Section indicator */}
					<div
						className="absolute font-inter font-bold"
						style={{
							top: '4px',
							left: '8px',
							fontSize: '11.5px',
							color: 'transparent',
						}}
					>
						[{key}]
					</div>
					{/* Inner content box stroke (keep outline visible while loading) */}
					<div
						className="absolute"
						style={{
							top: '50%',
							transform: 'translateY(-50%)',
							right: '10px',
							width: `${innerBoxWidth}px`,
							height: '43px',
							backgroundColor: 'transparent',
							border: '1px solid #000000',
							borderRadius: '6px',
						}}
					/>
				</div>
				);
			})}

			{/* Summary box skeleton */}
			<div
				className={cn("absolute", "research-panel-loading-wave-box")}
				style={{
					bottom: '14px',
					left: '50%',
					transform: 'translateX(-50%)',
					width: `${boxWidth}px`,
					height: '197px',
					border: '2px solid #000000',
					borderRadius: '8px',
					animationDelay: waveDelayForIndex(2 + bulletCount),
				}}
			>
				{/* Inner content box stroke (keep outline visible while loading) */}
				<div
					className="absolute"
					style={{
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						width: '350px',
						height: '182px',
						backgroundColor: 'transparent',
						border: '1px solid #000000',
						borderRadius: '6px',
					}}
				/>
			</div>
		</div>
	);
};

export default CampaignPageSkeleton;
