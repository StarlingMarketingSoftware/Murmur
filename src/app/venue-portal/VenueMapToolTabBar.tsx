'use client';

import { VenuePortalAddIcon } from '@/components/atoms/_svg/VenuePortalAddIcon';
import { VenuePortalChatIcon } from '@/components/atoms/_svg/VenuePortalChatIcon';
import { VenuePortalEventsIcon } from '@/components/atoms/_svg/VenuePortalEventsIcon';
import { VenuePortalProfileIcon } from '@/components/atoms/_svg/VenuePortalProfileIcon';
import { VENUE_MAP_OVERLAY_SCALE } from './constants';

// Tab-bar geometry from the Figma mock (native px, rendered at the shared overlay
// scale like the panels below it). The bar keeps one position and widens to the
// 781px panels' outer width for every tab except Create; the segment row stays
// anchored in the leftmost 461px so the tabs never move.
const BAR_W = 461;
const BAR_CHAT_W = 781;
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
// replaces the floating pill stack whenever a tool is selected. Sits just above
// the panels' shared top-[122px] edge (85 + 36 × 0.8 ≈ 114 leaves an ~8px gap),
// its bottom roughly flush with the header card's bottom like the Figma mock.
export function VenueMapToolTabBar({
	selectedTool,
	onToolSelect,
	unreadCount,
}: {
	selectedTool: VenueMapTool;
	onToolSelect: (tool: VenueMapTool) => void;
	unreadCount: number;
}) {
	const segmentClassName =
		'flex h-[34px] w-[105px] cursor-pointer items-center justify-center gap-[8px]';
	const labelClassName = (active: boolean) =>
		`font-inter text-[14px] font-semibold leading-none ${active ? 'text-black' : 'text-black/40'}`;

	return (
		<div
			data-venue-tool-ui="true"
			className="fixed left-[500px] top-[85px] z-[99] h-[36px] origin-top-left overflow-hidden rounded-[7.272px] border-[1.212px] border-black bg-white"
			style={{
				width: selectedTool === 'add' ? BAR_W : BAR_CHAT_W,
				transform: `scale(${VENUE_MAP_OVERLAY_SCALE})`,
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
