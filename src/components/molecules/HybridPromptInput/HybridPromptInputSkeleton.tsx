import type { CSSProperties, FC } from 'react';
import { cn } from '@/utils';

/**
 * Low-opacity loading skeleton for the {@link HybridPromptInput} ("Write") box.
 *
 * Modeled on the box's **Auto** tab (the default tab the box opens on) — NOT the
 * Hybrid tab. The Auto tab is a single, compact blue Body box (`#51A2E4` frame,
 * `#58A6E5` header, `#88C5F7` content well) containing a white Profile summary
 * card, a white "Booking For" bar, and one "+ Custom Instructions" bar. The
 * skeleton mirrors exactly that arrangement instead of the Hybrid
 * Intro/Research/CTA pill stack, so the loading shell matches what actually
 * paints first.
 *
 * It keeps the same low-opacity loading treatment already approved for the Write
 * box (and shared with the inbox detail skeleton in `InboxSection.tsx`):
 *   - `animate-pulse` on a single outer box,
 *   - solid black borders (the app's strong black-outlined design language),
 *   - low-opacity *tinted* panel fills (the Auto palette dropped to ~55-70%), and
 *   - solid grey placeholder bars (`#D9D9D9` for titles, `#E5E5E5` for body lines).
 *
 * Pixel metrics are copied from `HybridPromptInput.tsx` / `FullAutoBodyBlock.tsx`
 * (499x703 panel, 31px mode chrome, 468px content column, ~233px Auto body box,
 * 27px body header, 104px profile card, 28px booking bar, 22px custom-instructions
 * bar, 25px subject/signature pills).
 */
interface HybridPromptInputSkeletonProps {
	/** Mirror of HPI's `containerHeightPx` so the skeleton matches embedded heights. */
	containerHeightPx?: number;
	/** Mirror of HPI's `dataCampaignMainBox` so cross-tab morph keys still match. */
	dataCampaignMainBox?: string | null;
	/** Mirror of HPI's `forceDesktop` to lock the desktop width on small screens. */
	forceDesktop?: boolean;
	/** Hide the Generate Test placeholder (matches HPI's `hideGenerateTestButton`). */
	hideGenerateTestButton?: boolean;
	className?: string;
}

// Solid black outlines (matches the real HPI + the inbox detail skeleton).
const SKELETON_BORDER = '#000000';
// Low-opacity tints of the Auto tab's own palette.
const HPI_GREEN_TINT = 'rgba(166, 226, 168, 0.60)'; // #A6E2A8 panel @ 60%
const AUTO_BODY_FRAME_TINT = 'rgba(81, 162, 228, 0.55)'; // #51A2E4 @ 55%
const AUTO_BODY_HEADER_TINT = 'rgba(88, 166, 229, 0.6)'; // #58A6E5 @ 60%
const AUTO_BODY_CONTENT_TINT = 'rgba(136, 197, 247, 0.5)'; // #88C5F7 @ 50%
const AUTO_TOGGLE_TINT = 'rgba(136, 197, 247, 0.7)'; // selected pill / custom-instructions bar
const WHITE_TINT = 'rgba(255, 255, 255, 0.7)'; // white cards (profile, booking)
const WHITE_TINT_SOFT = 'rgba(255, 255, 255, 0.55)'; // mode highlight, generate-test
// Solid grey placeholder bars (identical to the inbox skeleton).
const MARK = '#D9D9D9';
const MARK_SOFT = '#E5E5E5';

const Bar: FC<{
	className?: string;
	style?: CSSProperties;
	soft?: boolean;
}> = ({ className, style, soft }) => (
	<div
		aria-hidden="true"
		className={cn('rounded', className)}
		style={{ backgroundColor: soft ? MARK_SOFT : MARK, ...style }}
	/>
);

const HybridPromptInputSkeleton: FC<HybridPromptInputSkeletonProps> = ({
	containerHeightPx,
	dataCampaignMainBox,
	forceDesktop,
	hideGenerateTestButton,
	className,
}) => {
	const campaignMainBox =
		dataCampaignMainBox === undefined ? 'writing' : dataCampaignMainBox || undefined;

	return (
		<div className={cn('flex justify-center', className)} data-hpi-skeleton-root>
			<div
				className={cn(
					!forceDesktop ? 'w-[96.27vw]' : 'w-[499px]',
					'relative mx-auto flex max-w-[499px] flex-col overflow-hidden rounded-[8px] animate-pulse'
				)}
				style={{
					height: containerHeightPx ? `${containerHeightPx}px` : '703px',
					border: `3px solid ${SKELETON_BORDER}`,
					background: HPI_GREEN_TINT,
					boxSizing: 'border-box',
				}}
				data-campaign-main-box={campaignMainBox}
				role="status"
				aria-busy="true"
				aria-label="Loading writing prompt"
			>
				<span className="sr-only">Loading writing prompt…</span>

				{/* Mode chrome (Auto / Manual / Hybrid) — 31px white strip + divider.
				    The selected-mode highlight sits under the first (Auto) slot. */}
				<div
					className="relative h-[31px] shrink-0 bg-white"
					style={{ borderBottom: `3px solid ${SKELETON_BORDER}` }}
				>
					<div className="relative mx-auto flex h-full w-[475px] max-w-full items-center justify-center px-[8px]">
						<div className="relative flex w-full max-w-[300px] items-center justify-between">
							{/* Auto label, wrapped by the selected-mode highlight pill */}
							<div className="relative flex items-center justify-center px-[15px] py-[4px]">
								<div
									aria-hidden="true"
									className="absolute inset-0 rounded-[8px]"
									style={{
										border: `1.3px solid ${SKELETON_BORDER}`,
										backgroundColor: WHITE_TINT_SOFT,
									}}
								/>
								<Bar className="relative z-10 h-[10px] w-[34px]" />
							</div>
							<Bar className="h-[10px] w-[48px]" soft />
							<Bar className="h-[10px] w-[42px]" soft />
						</div>
					</div>
				</div>

				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{/* Subject pill — 110x25, matches HPI's collapsed Auto Subject bar */}
					<div className="flex flex-col items-center pt-[38px]">
						<div className={cn(!forceDesktop ? 'w-[89.33vw]' : 'w-[468px]', 'max-w-[468px]')}>
							<div
								className="flex h-[25px] w-[110px] items-center justify-center rounded-[10px] bg-white"
								style={{ border: `2px solid ${SKELETON_BORDER}` }}
							>
								<Bar className="h-[9px] w-[62px]" />
							</div>
						</div>
					</div>

					{/* Auto Body box — 468 wide, ~233 tall, blue-tinted */}
					<div className="mt-[12px] flex w-full flex-col items-center">
						<div
							className={cn(
								!forceDesktop ? 'w-[89.33vw]' : 'w-[468px]',
								'max-w-[468px] overflow-hidden rounded-[6px] p-[4px]'
							)}
							style={{
								border: `1px solid ${SKELETON_BORDER}`,
								background: AUTO_BODY_FRAME_TINT,
							}}
						>
							{/* Body header — Body label + Standard/High power toggles */}
							<div
								className="flex h-[27px] items-stretch overflow-hidden rounded-t-[6px]"
								style={{ background: AUTO_BODY_HEADER_TINT }}
							>
								<div className="flex flex-1 items-center pl-[16px]">
									<Bar className="h-[11px] w-[42px]" />
								</div>
								<div className="h-full w-[1px] bg-black" />
								<div
									className="flex h-full w-[132px] items-center justify-center"
									style={{ background: AUTO_TOGGLE_TINT }}
								>
									<Bar className="h-[9px] w-[88px]" soft />
								</div>
								<div className="h-full w-[1px] bg-black" />
								<div className="flex h-full w-[46px] items-center justify-center">
									<Bar className="h-[9px] w-[25px]" soft />
								</div>
								<div className="w-[31px]" />
							</div>

							{/* Body content well */}
							<div
								className="flex justify-center rounded-b-[6px] p-2"
								style={{ background: AUTO_BODY_CONTENT_TINT }}
							>
								<div className="flex w-[448px] max-w-full flex-col items-start">
									{/* Profile summary card (avatar + name + chips) */}
									<div
										className="h-[104px] w-full overflow-hidden rounded-[8px]"
										style={{
											border: `2px solid ${SKELETON_BORDER}`,
											background: WHITE_TINT,
										}}
									>
										<div
											className="flex h-[26px] items-center gap-[8px] px-[9px]"
											style={{ borderBottom: `1px solid ${SKELETON_BORDER}` }}
										>
											<div
												className="h-[22px] w-[22px] shrink-0 rounded-full"
												style={{ backgroundColor: 'rgba(123, 219, 127, 0.85)' }}
											/>
											<Bar className="h-[16px] w-[96px]" />
										</div>
										<div className="flex flex-wrap gap-x-[6px] gap-y-[8px] px-[8px] pt-[10px]">
											<Bar className="h-[20px] w-[58px]" soft />
											<Bar className="h-[20px] w-[124px]" soft />
											<Bar className="h-[20px] w-[52px]" soft />
											<Bar className="h-[20px] w-[44px]" soft />
										</div>
									</div>

									{/* Booking For bar */}
									<div
										className="mt-[10px] flex h-[28px] w-full items-center justify-between rounded-[8px] px-4"
										style={{
											border: `2px solid ${SKELETON_BORDER}`,
											background: WHITE_TINT,
										}}
									>
										<Bar className="h-[10px] w-[76px]" />
										<Bar className="h-[10px] w-[58px]" />
									</div>

									{/* + Custom Instructions bar */}
									<div
										className="mt-[14px] flex h-[22px] w-full items-center gap-[6px] rounded-[8px] px-4"
										style={{
											border: `2px solid ${SKELETON_BORDER}`,
											background: AUTO_TOGGLE_TINT,
										}}
									>
										<Bar className="h-[10px] w-[8px]" />
										<Bar className="h-[9px] w-[118px]" />
									</div>
								</div>
							</div>
						</div>

						{/* Signature pill — 122x25 */}
						<div
							className={cn(
								!forceDesktop ? 'w-[89.33vw]' : 'w-[468px]',
								'mt-[16px] max-w-[468px]'
							)}
						>
							<div
								className="flex h-[25px] w-[122px] items-center justify-center rounded-[10px] bg-white"
								style={{ border: `2px solid ${SKELETON_BORDER}` }}
							>
								<Bar className="h-[9px] w-[72px]" />
							</div>
						</div>
					</div>

					{/* Generate Test button — centered in the green expanse below */}
					{!hideGenerateTestButton && (
						<>
							<div className="flex-1" />
							<div className="flex w-full items-center justify-center">
								<div
									className="h-[28px] w-[232px] rounded-[12px]"
									style={{
										border: `2px solid ${SKELETON_BORDER}`,
										background: WHITE_TINT_SOFT,
									}}
								/>
							</div>
							<div className="flex-1" />
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export { HybridPromptInputSkeleton };
