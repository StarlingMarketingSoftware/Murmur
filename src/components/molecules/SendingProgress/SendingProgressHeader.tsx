'use client';

import { FC } from 'react';
import { cn } from '@/utils';
import {
	SENDING_ACTIVE_GREEN,
	SENDING_PANEL_GREEN,
	SENDING_STACK_GREEN,
} from './constants';

export interface SendingProgressHeaderProps {
	/** Fixed batch size — "Sending 49". */
	total: number;
	/** Successful sends so far — drives the "+N Sent" pill. */
	sentCount: number;
	/** Processed sends (sent + failed) — drives the bar so it always completes. */
	completedCount: number;
	onDismiss: () => void;
	/**
	 * 'panel' embeds the header at the top of the sending contact list panel;
	 * 'floating' wraps it in its own bordered green box (search-tab overlay).
	 * 'dashboard' is the single-row queued-send header over the dashboard stack.
	 */
	variant: 'panel' | 'floating' | 'dashboard';
	width?: number | string;
}

export const SendingProgressHeader: FC<SendingProgressHeaderProps> = ({
	total,
	sentCount,
	completedCount,
	onDismiss,
	variant,
	width,
}) => {
	const fillFraction = total > 0 ? Math.min(1, completedCount / total) : 0;

	if (variant === 'dashboard') {
		return (
			<div
				className="flex flex-row items-center gap-[13px] rounded-[6px] border-[1.5px] border-black px-1 pr-2 font-inter"
				style={{
					width: width ?? '100%',
					height: 28,
					backgroundColor: SENDING_PANEL_GREEN,
				}}
			>
				<div
					className="flex items-center justify-between rounded-[6px] border-[1.5px] border-white/90 px-3"
					style={{ width: 185, height: 20 }}
				>
					<span className="text-[13px] font-medium leading-none text-white">
						Sending
					</span>
					<span className="text-[13px] font-medium leading-none text-white tabular-nums">
						{total}
					</span>
				</div>
				<div className="flex flex-1 items-center justify-end gap-[13px]">
					<span className="text-[13px] font-medium leading-none text-black select-none">
						About
					</span>
					<button
						type="button"
						aria-label="Hide sending view"
						onClick={onDismiss}
						className="flex items-center justify-center text-black hover:opacity-70"
						style={{ width: 18, height: 18 }}
					>
						<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
							<line
								x1="3"
								y1="3"
								x2="13"
								y2="13"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="butt"
							/>
							<line
								x1="13"
								y1="3"
								x2="3"
								y2="13"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="butt"
							/>
						</svg>
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				'flex flex-col gap-[6px] font-inter',
				variant === 'floating' && 'rounded-[10px] border-[1.5px] border-black p-2'
			)}
			style={{
				width: width ?? '100%',
				...(variant === 'floating'
					? {
							backgroundColor: SENDING_PANEL_GREEN,
							boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
						}
					: {}),
			}}
		>
			<div className="flex items-center gap-2">
				<div className="flex-1 flex items-center justify-between rounded-[7px] border-[1.5px] border-white/90 px-3 h-[28px]">
					<span className="text-[16px] font-semibold leading-none text-white">
						Sending
					</span>
					<span className="text-[16px] font-semibold leading-none text-white tabular-nums">
						{total}
					</span>
				</div>
				<span className="text-[13px] leading-none text-black/85 px-1 select-none">
					About
				</span>
				<button
					type="button"
					aria-label="Hide sending view"
					onClick={onDismiss}
					className="flex items-center justify-center w-[20px] h-[20px] text-black hover:opacity-70"
				>
					<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
						<path
							d="M1 1L11 11M11 1L1 11"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
						/>
					</svg>
				</button>
			</div>
			<div className="rounded-[8px] border-[1.5px] border-black overflow-hidden">
				<div className="relative h-[13px] bg-white">
					<div
						className="absolute left-0 top-0 h-full"
						style={{
							backgroundColor: SENDING_ACTIVE_GREEN,
							width: `${fillFraction * 100}%`,
							transition: 'width 300ms ease',
						}}
					/>
					<span className="absolute right-[4px] top-1/2 -translate-y-1/2 text-[10px] font-bold leading-none text-black tabular-nums">
						{completedCount}
					</span>
				</div>
				<div
					className="flex items-center gap-2 h-[26px] px-2 border-t-[1.5px] border-black"
					style={{ backgroundColor: SENDING_STACK_GREEN }}
				>
					<span className="inline-flex items-center justify-center rounded-[6px] border border-black bg-white/80 px-2 h-[17px] text-[11px] font-bold leading-none tabular-nums">
						+{sentCount}
					</span>
					<span className="text-[13px] font-bold leading-none text-black">Sent</span>
				</div>
			</div>
		</div>
	);
};
