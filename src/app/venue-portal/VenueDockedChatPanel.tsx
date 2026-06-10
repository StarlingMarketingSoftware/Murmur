'use client';

import { Maximize2 } from 'lucide-react';
import { ProfileAreaMarkerIcon } from '@/components/atoms/_svg/ProfileAreaMarkerIcon';
import { getProfileGenreIcon } from '@/components/molecules/HybridPromptInput/profileFieldIcons';
import { ConversationThread } from '@/components/organisms/ConversationsPane';
import {
	useGetConversations,
	type ConversationThreadFilter,
} from '@/hooks/queryHooks/useConversations';
import { useGetVenueApplications } from '@/hooks/queryHooks/useVenueApplications';
import { CardPill } from './VenueChatMapPanel';
import { VENUE_MAP_LEFT_CLUSTER_SCALE } from './constants';

// Persistent docked chat for the map view: pins the last-active thread to the
// right edge below the notifications cluster (same fixed-corner + 0.7-scale
// convention) so the conversation stays in view while the user moves between
// tools. The parent hides it only while the Chat tool shows the thread itself.
// Being mounted marks the thread read as messages arrive — accepted, since the
// thread is visibly on screen the whole time.
export function VenueDockedChatPanel({
	conversationId,
	thread,
	onExpand,
}: {
	conversationId: number;
	thread: ConversationThreadFilter;
	onExpand: () => void;
}) {
	// Header identity comes from the inbox lists (cache-shared with the portal
	// root's 30s polls — no new request): the messages response carries no
	// genre/area for artist counterparts. Application threads resolve from the
	// Replies row; general threads (or a row gone with its deleted event) fall
	// back to the conversation list's counterpart.
	const { data: conversations } = useGetConversations({ enabled: true });
	const { data: applications } = useGetVenueApplications({ enabled: true });
	const applicationRow =
		typeof thread === 'number'
			? ((applications ?? []).find((row) => row.id === thread) ?? null)
			: null;
	const conversation =
		(conversations ?? []).find((item) => item.id === conversationId) ?? null;
	const name = applicationRow?.applicantName ?? conversation?.counterpart.name ?? '';
	const genre = applicationRow?.genre ?? conversation?.counterpart.genre ?? null;
	const area = applicationRow?.area ?? conversation?.counterpart.area ?? null;
	const GenreIcon = getProfileGenreIcon(genre);
	return (
		<div
			data-venue-tool-ui="true"
			className="fixed right-[24px] top-[545px] z-[100] origin-top-right"
			style={{ transform: `scale(${VENUE_MAP_LEFT_CLUSTER_SCALE})` }}
		>
			{/* Tool-panel chrome at the notifications card's 431px width so the two
			    read as one right-edge column. */}
			<div className="relative h-[430px] w-[431px] rounded-[10px] border-[2px] border-black/40 bg-white/15">
				<div className="absolute left-[12px] top-[4px] font-inter text-[12.358px] font-medium leading-[16.477px] text-black">
					Chat
				</div>
				<div className="absolute left-[7px] top-[20px] flex h-[398px] w-[413px] flex-col overflow-hidden rounded-[8px] border-[2px] border-black bg-[linear-gradient(180deg,#BBD4F7_0%,#FFF_100%)]">
					<div className="flex h-[40px] shrink-0 items-center gap-[6px] border-b-[2px] border-black bg-white px-[12px]">
						<span className="min-w-0 shrink truncate font-inter text-[15px] font-bold text-black">
							{name}
						</span>
						{genre && (
							<CardPill
								icon={
									GenreIcon && (
										<GenreIcon aria-hidden="true" className="h-[12px] w-[12px] shrink-0" />
									)
								}
								label={genre}
							/>
						)}
						{area && (
							<CardPill
								icon={
									<ProfileAreaMarkerIcon
										aria-hidden="true"
										className="h-[12px] w-[10px] shrink-0"
									/>
								}
								label={area}
							/>
						)}
						<button
							type="button"
							onClick={onExpand}
							aria-label="Open in Chat"
							className="ml-auto flex h-[24px] w-[24px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-black bg-white text-black transition hover:brightness-95"
						>
							<Maximize2 className="h-[13px] w-[13px]" strokeWidth={2.25} />
						</button>
					</div>
					<ConversationThread
						conversationId={conversationId}
						thread={thread}
						variant="venueMap"
						hideHeader
						className="min-h-0 flex-1 bg-transparent"
					/>
				</div>
			</div>
		</div>
	);
}
