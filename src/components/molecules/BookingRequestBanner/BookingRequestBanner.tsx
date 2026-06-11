'use client';

import type { Ref } from 'react';
import { SquareX } from 'lucide-react';
import { cn } from '@/utils/ui';
import { CalendarPlusIcon } from '@/components/atoms/_svg/CalendarPlusIcon';
import {
	formatCalendarDate,
	parseIsoKey,
} from '@/components/molecules/DashboardCalendarPanel/calendarShared';

// In-thread banner for a booking request, both sides of the handshake:
// - venue, pending:   "Booking Request Sent" + "Waiting on confirmation from X…",
//   with the ⊗ that cancels the request.
// - artist, pending:  "Booking Request" + a green "Confirm booking" chip.
// - confirmed (both): single green "Booked — {date}" strip.
// Canceled requests are the callers' concern (venue thread hides them; the artist
// inbox shows a muted line) — this component never receives status 'canceled'.
type BookingRequestBannerProps = {
	status: 'pending' | 'confirmed';
	perspective: 'venue' | 'artist';
	// Artist first name (venue perspective's waiting row); unused for artists.
	counterpartFirstName?: string;
	date: string | null; // 'YYYY-MM-DD'; shown in the confirmed state
	// The event behind the request (event-thread requests only) — names WHAT is
	// being booked; general-thread requests pass nothing and render as before.
	eventName?: string | null;
	eventDateLabel?: string | null; // the event's faithful whenLabel
	// Optimistic in-flight render (the delivering message still has a temp id) —
	// dimmed, controls disabled.
	pending?: boolean;
	compact?: boolean;
	onCancel?: () => void;
	onConfirm?: () => void;
	bannerRef?: Ref<HTMLDivElement>;
	className?: string;
};

export function BookingRequestBanner({
	status,
	perspective,
	counterpartFirstName = '',
	date,
	eventName = null,
	eventDateLabel = null,
	pending = false,
	compact = false,
	onCancel,
	onConfirm,
	bannerRef,
	className,
}: BookingRequestBannerProps) {
	if (status === 'confirmed') {
		const dateLabel = date ? formatCalendarDate(parseIsoKey(date)) : null;
		return (
			<div
				ref={bannerRef}
				className={cn(
					'flex w-full items-center justify-center bg-[#B7FFC5] font-inter',
					compact ? 'h-[26px] gap-[5px] px-[8px]' : 'h-[34px] gap-[8px]',
					className
				)}
			>
				<CalendarPlusIcon
					className={cn(
						'shrink-0 text-black',
						compact ? 'h-[14px] w-[14px]' : 'h-[18px] w-[18px]'
					)}
				/>
				<span
					className={cn(
						'min-w-0 truncate font-semibold text-black',
						compact ? 'text-[12px]' : 'text-[15px]'
					)}
				>
					Booked{eventName ? ` — ${eventName}` : ''}
					{dateLabel ? ` — ${dateLabel}` : ''}
				</span>
			</div>
		);
	}

	return (
		<div
			ref={bannerRef}
			className={cn('w-full font-inter', pending && 'opacity-60', className)}
		>
			<div
				className={cn(
					'relative flex items-center justify-center',
					compact ? 'h-[24px] gap-[5px] px-[28px]' : 'h-[34px] gap-[8px]'
				)}
				style={{ background: 'linear-gradient(90deg, #BDD7F5 0%, #F8FAFF 100%)' }}
			>
				<CalendarPlusIcon
					className={cn(
						'shrink-0 text-black',
						compact ? 'h-[13px] w-[13px]' : 'h-[18px] w-[18px]'
					)}
				/>
				<span
					className={cn(
						'min-w-0 truncate font-semibold text-black',
						compact ? 'text-[12px]' : 'text-[15px]'
					)}
				>
					{perspective === 'venue' ? 'Booking Request Sent' : 'Booking Request'}
					{eventName ? ` — ${eventName}` : ''}
				</span>
				{perspective === 'venue' && onCancel && (
					<button
						type="button"
						aria-label="Cancel booking request"
						onClick={onCancel}
						disabled={pending}
						className={cn(
							'absolute top-1/2 -translate-y-1/2 text-black/30 transition-colors hover:text-black/60 disabled:pointer-events-none',
							compact ? 'right-[6px]' : 'right-[10px]'
						)}
					>
						<SquareX
							className={compact ? 'h-[14px] w-[14px]' : 'h-[20px] w-[20px]'}
							strokeWidth={1.5}
						/>
					</button>
				)}
			</div>
			<div
				className={cn(
					'flex items-center justify-center bg-white/60',
					compact ? 'h-[18px] gap-[6px] px-[8px]' : 'h-[26px] gap-[10px]'
				)}
			>
				{perspective === 'venue' ? (
					<span
						className={cn(
							'min-w-0 truncate font-medium text-black/55',
							compact ? 'text-[10px]' : 'text-[13px]'
						)}
					>
						Waiting on confirmation from {counterpartFirstName || 'the artist'}…
					</span>
				) : onConfirm ? (
					<>
						{eventDateLabel && (
							<span
								className={cn(
									'min-w-0 truncate font-medium text-black/55',
									compact ? 'text-[10px]' : 'text-[13px]'
								)}
							>
								{eventDateLabel}
							</span>
						)}
						<button
							type="button"
							onClick={onConfirm}
							disabled={pending}
							className={cn(
								'flex shrink-0 items-center border-[0.858px] border-black bg-[#B7FFC5] font-semibold text-black transition hover:brightness-95 disabled:opacity-50',
								compact
									? 'h-[16px] rounded-[8px] px-[10px] text-[9px]'
									: 'h-[20px] rounded-[10px] px-[18px] text-[11px]'
							)}
						>
							Confirm booking
						</button>
					</>
				) : (
					// Read-only surfaces (no confirm wiring) show status text instead of
					// a permanently disabled chip.
					<span
						className={cn(
							'font-medium text-black/55',
							compact ? 'text-[10px]' : 'text-[13px]'
						)}
					>
						Waiting for your confirmation
					</span>
				)}
			</div>
		</div>
	);
}
