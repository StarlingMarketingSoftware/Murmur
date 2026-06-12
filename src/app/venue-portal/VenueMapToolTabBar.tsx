'use client';

import { VenuePortalAddIcon } from '@/components/atoms/_svg/VenuePortalAddIcon';
import { VenuePortalChatIcon } from '@/components/atoms/_svg/VenuePortalChatIcon';
import { VenuePortalEventsIcon } from '@/components/atoms/_svg/VenuePortalEventsIcon';
import { VenuePortalProfileIcon } from '@/components/atoms/_svg/VenuePortalProfileIcon';
import {
	VENUE_MAP_PANEL_NATIVE_W_PX,
	VENUE_MAP_TAB_BAR_NATIVE_W_PX,
} from './constants';
import type { VenuePortalFrame } from './useVenuePortalLayout';

// Tab-bar geometry from the Figma mock (native px, rendered at the frame's
// scale like the panels below it). The bar keeps one position per viewport (a
// left anchor that drifts to horizontal center beyond the 1080p baseline — see
// useVenuePortalLayout) and widens to the 781px panels' outer width for every
// tab except Create; the segment row stays anchored in the leftmost 461px so
// the tabs never move.
const BAR_W = VENUE_MAP_TAB_BAR_NATIVE_W_PX;
const BAR_CHAT_W = VENUE_MAP_PANEL_NATIVE_W_PX;
const BAR_BORDER_W = 1.212;
const SEGMENT_ROW_W = BAR_W - BAR_BORDER_W * 2;

type VenueMapTool = 'add' | 'profile' | 'mail' | 'events';

const SEGMENT_ACTIVE_BG: Record<VenueMapTool, string> = {
	add: '#F57D7D',
	mail: '#BCE2FF',
	profile: '#BCC4FF',
	events: '#BCFFBD',
};

// Horizontal Create/Chat/Events/Profile bar shown above the open tool panel; it
// replaces the floating pill stack whenever a tool is selected. The frame comes
// from useVenuePortalLayout: just above the panels' top edge at the wider tiers,
// pinned to the viewport's top-left corner at the compact tier — where it also
// renders with no tool selected (the pill stack doesn't exist there), so
// selectedTool is nullable. At compact the bar never takes the 781 panel-match
// width (it wouldn't fit, and it's standalone chrome there).
export function VenueMapToolTabBar({
	selectedTool,
	onToolSelect,
	unreadCount,
	frame,
	compact,
}: {
	selectedTool: VenueMapTool | null;
	onToolSelect: (tool: VenueMapTool) => void;
	unreadCount: number;
	frame: VenuePortalFrame;
	compact: boolean;
}) {
	const segmentClassName =
		'flex h-[34px] w-[105px] cursor-pointer items-center justify-center gap-[8px]';
	const labelClassName = (active: boolean) =>
		`font-inter text-[14px] font-semibold leading-none ${active ? 'text-black' : 'text-black/40'}`;

	return (
		<div
			data-venue-tool-ui="true"
			className="fixed z-[99] h-[36px] origin-top-left overflow-hidden rounded-[7.272px] border-[1.212px] border-black bg-white"
			style={{
				left: frame.left,
				top: frame.top,
				width: compact || selectedTool === 'add' || selectedTool === null
					? BAR_W
					: BAR_CHAT_W,
				transform: `scale(${frame.scale})`,
			}}
		>
			<div
				className="flex h-full items-center justify-between"
				style={{ width: SEGMENT_ROW_W }}
			>
				<button
					type="button"
					aria-label="Create"
					aria-pressed={selectedTool === 'add'}
					onClick={() => onToolSelect('add')}
					className={segmentClassName}
					style={
						selectedTool === 'add'
							? { backgroundColor: SEGMENT_ACTIVE_BG.add }
							: undefined
					}
				>
					<VenuePortalAddIcon
						selected={selectedTool === 'add'}
						selectedFill="#E05555"
						className="h-[20px] w-auto shrink-0"
					/>
					<span className={labelClassName(selectedTool === 'add')}>Create</span>
				</button>
				<button
					type="button"
					aria-label="Chat"
					aria-pressed={selectedTool === 'mail'}
					onClick={() => onToolSelect('mail')}
					className={segmentClassName}
					style={
						selectedTool === 'mail'
							? { backgroundColor: SEGMENT_ACTIVE_BG.mail }
							: undefined
					}
				>
					<span className="relative flex shrink-0 items-center justify-center">
						<VenuePortalChatIcon
							selected={selectedTool === 'mail'}
							className="h-[20px] w-auto"
						/>
						{unreadCount > 0 && (
							<span className="pointer-events-none absolute -right-[4px] -top-[4px] flex h-[12px] min-w-[12px] items-center justify-center rounded-full bg-[#2F6FED] px-[2px] text-[8px] font-semibold leading-none text-white">
								{unreadCount > 99 ? '99+' : unreadCount}
							</span>
						)}
					</span>
					<span className={labelClassName(selectedTool === 'mail')}>Chat</span>
				</button>
				<button
					type="button"
					aria-label="Events"
					aria-pressed={selectedTool === 'events'}
					onClick={() => onToolSelect('events')}
					className={segmentClassName}
					style={
						selectedTool === 'events'
							? { backgroundColor: SEGMENT_ACTIVE_BG.events }
							: undefined
					}
				>
					<VenuePortalEventsIcon
						selected={selectedTool === 'events'}
						className="h-[20px] w-auto shrink-0"
					/>
					<span className={labelClassName(selectedTool === 'events')}>Events</span>
				</button>
				<button
					type="button"
					aria-label="Profile"
					aria-pressed={selectedTool === 'profile'}
					onClick={() => onToolSelect('profile')}
					className={segmentClassName}
					style={
						selectedTool === 'profile'
							? { backgroundColor: SEGMENT_ACTIVE_BG.profile }
							: undefined
					}
				>
					<VenuePortalProfileIcon
						selected={selectedTool === 'profile'}
						className="h-[20px] w-auto shrink-0"
					/>
					<span className={labelClassName(selectedTool === 'profile')}>Profile</span>
				</button>
			</div>
		</div>
	);
}
