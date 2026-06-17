'use client';

import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';

type SelectionFolderMoveBannerProps = {
	count: number;
	folderName: string;
	iconColor: string;
	includeTopDivider?: boolean;
	phase: 'moving' | 'complete' | 'exiting';
	onDismiss: () => void;
};

export function SelectionFolderMoveBanner({
	count,
	folderName,
	iconColor,
	includeTopDivider = false,
	phase,
	onDismiss,
}: SelectionFolderMoveBannerProps) {
	const contactLabel = count === 1 ? 'contact' : 'contacts';
	const actionLabel =
		phase === 'moving'
			? `Moving ${count} ${contactLabel} to`
			: `${count} ${contactLabel} moved to`;

	return (
		<div
			className={`selection-folder-move-banner flex-shrink-0 ${
				phase === 'exiting' ? 'selection-folder-move-banner-exit' : ''
			}`}
			aria-live="polite"
		>
			<div
				className={`relative flex h-[38px] w-full items-center overflow-hidden border-b-2 border-black bg-[#FD8E89] px-[10px] pr-[34px] font-inter text-black ${
					includeTopDivider ? 'border-t-2' : 'border-t-0'
				}`}
			>
				<span className="shrink-0 text-[13px] font-semibold leading-none">
					{actionLabel}
				</span>
				<div
					className="mx-[7px] flex w-[88px] shrink-0 items-center"
					aria-hidden="true"
				>
					<div className="h-[1.5px] flex-1 bg-black" />
					<div className="h-0 w-0 border-y-[4px] border-l-[7px] border-y-transparent border-l-black" />
				</div>
				<div className="flex min-w-0 shrink-0 items-center gap-[5px]">
					<DashboardActionBarFolderIcon
						width={18}
						height={11}
						className="shrink-0"
						style={{ color: iconColor }}
					/>
					<span className="max-w-[128px] truncate text-[13px] font-bold leading-none">
						{folderName}
					</span>
				</div>
				{phase === 'complete' && (
					<button
						type="button"
						aria-label="Dismiss folder move notification"
						onClick={onDismiss}
						className="absolute right-[10px] top-[10px] flex h-[14px] w-[14px] items-center justify-center"
					>
						<svg
							width="14"
							height="14"
							viewBox="0 0 14 14"
							aria-hidden="true"
							className="block"
						>
							<line
								x1="2"
								y1="2"
								x2="12"
								y2="12"
								stroke="#FFFFFF"
								strokeWidth="2.5"
								strokeLinecap="butt"
							/>
							<line
								x1="12"
								y1="2"
								x2="2"
								y2="12"
								stroke="#FFFFFF"
								strokeWidth="2.5"
								strokeLinecap="butt"
							/>
						</svg>
					</button>
				)}
			</div>
		</div>
	);
}
