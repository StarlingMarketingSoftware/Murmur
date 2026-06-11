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
	// Optimistic in-flight render (the delivering message still has a temp id) —
	// dimmed, controls disabled.
	pending?: boolean;
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
	pending = false,
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
					'flex h-[34px] w-full items-center justify-center gap-[8px] bg-[#B7FFC5] font-inter',
					className
				)}
			>
				<CalendarPlusIcon className="h-[18px] w-[18px] shrink-0 text-black" />
				<span className="text-[15px] font-semibold text-black">
					Booked{dateLabel ? ` — ${dateLabel}` : ''}
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
				className="relative flex h-[34px] items-center justify-center gap-[8px]"
				style={{ background: 'linear-gradient(90deg, #BDD7F5 0%, #F8FAFF 100%)' }}
			>
				<CalendarPlusIcon className="h-[18px] w-[18px] shrink-0 text-black" />
				<span className="text-[15px] font-semibold text-black">
					{perspective === 'venue' ? 'Booking Request Sent' : 'Booking Request'}
				</span>
				{perspective === 'venue' && onCancel && (
					<button
						type="button"
						aria-label="Cancel booking request"
						onClick={onCancel}
						disabled={pending}
						className="absolute right-[10px] top-1/2 -translate-y-1/2 text-black/30 transition-colors hover:text-black/60 disabled:pointer-events-none"
					>
						<SquareX className="h-[20px] w-[20px]" strokeWidth={1.5} />
					</button>
				)}
			</div>
			<div className="flex h-[26px] items-center justify-center bg-white/60">
				{perspective === 'venue' ? (
					<span className="text-[13px] font-medium text-black/55">
						Waiting on confirmation from {counterpartFirstName || 'the artist'}…
					</span>
				) : onConfirm ? (
					<button
						type="button"
						onClick={onConfirm}
						disabled={pending}
						className="flex h-[20px] items-center rounded-[10px] border-[0.858px] border-black bg-[#B7FFC5] px-[18px] text-[11px] font-semibold text-black transition hover:brightness-95 disabled:opacity-50"
					>
						Confirm booking
					</button>
				) : (
					// Read-only surfaces (no confirm wiring) show status text instead of
					// a permanently disabled chip.
					<span className="text-[13px] font-medium text-black/55">
						Waiting for your confirmation
					</span>
				)}
			</div>
		</div>
	);
}
