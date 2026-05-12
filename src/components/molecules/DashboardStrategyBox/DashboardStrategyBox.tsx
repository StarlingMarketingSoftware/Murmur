import { FC, useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useRouter } from 'next/navigation';
import { useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import type { EmailWithRelations, InboundEmailWithRelations } from '@/types';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { US_STATES } from '@/constants/usStates';
import {
	isCoffeeShopTitle,
	isMusicVenueTitle,
	isRestaurantTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
} from '@/utils/restaurantTitle';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { CampaignTitlePills } from '@/components/molecules/CampaignTitlePills/CampaignTitlePills';
import {
	DASHBOARD_DECORATIVE_CENTER,
	DASHBOARD_DECORATIVE_PITCH,
	MAPBOX_STYLE,
} from '@/components/molecules/SearchResultsMap/constants';
import {
	applyFreeTrialMapVisualTuning,
	applyMapboxFogForMoodAndNight,
	applyMurmurGlobeLighting,
	applyNightLandPalette,
	ensureWorldLandFill,
} from '@/components/molecules/SearchResultsMap/basemap';
import {
	DASHBOARD_GLOBE_SPIN_STEP_MS,
	getDashboardGlobeSpinLng,
	subscribeDashboardGlobeSpin,
} from '@/components/molecules/SearchResultsMap/dashboardGlobeSpinState';
import { computeMoodVisualNightT } from '@/components/molecules/SearchResultsMap/moodConfig';
import { getMoodConfig } from '@/lib/weather/moodConfig';
import { urls } from '@/constants/urls';

export type StrategyMockCampaign = {
	id: number;
	name: string;
	draftCount?: number;
	sentCount?: number;
	contactCount?: number;
};

export type StrategyMockState = {
	campaigns?: StrategyMockCampaign[];
	newEmailCount?: number;
};

type CampaignWithCounts = {
	id: number;
	name: string;
	draftCount?: number;
	sentCount?: number;
	contactEmails?: string[];
};

type StrategyActionKind =
	| 'draftMessages'
	| 'reviewDrafts'
	| 'replyEmails'
	| 'searchContacts';

type StrategyAction = {
	kind: StrategyActionKind;
	count: number;
	campaign?: CampaignWithCounts;
	weight: number;
};

const mockToCampaign = (mock: StrategyMockCampaign): CampaignWithCounts => ({
	id: mock.id,
	name: mock.name,
	draftCount: mock.draftCount ?? 0,
	sentCount: mock.sentCount ?? 0,
	contactEmails: new Array(mock.contactCount ?? 0).fill('mock@example.com'),
});

const buildCampaignActionCandidates = (
	campaigns: CampaignWithCounts[] | undefined
): StrategyAction[] => {
	if (!campaigns || campaigns.length === 0) return [];

	const candidates: StrategyAction[] = [];

	for (const campaign of campaigns) {
		const draftCount = campaign.draftCount ?? 0;
		const sentCount = campaign.sentCount ?? 0;
		const totalContacts = campaign.contactEmails?.length ?? 0;
		const contactsNeedingDraft = Math.max(0, totalContacts - draftCount - sentCount);

		if (contactsNeedingDraft > 0) {
			candidates.push({
				kind: 'draftMessages',
				count: contactsNeedingDraft,
				campaign,
				weight: contactsNeedingDraft,
			});
		}

		if (draftCount > 0) {
			candidates.push({
				kind: 'reviewDrafts',
				count: draftCount,
				campaign,
				// Reviewing/sending drafts is a slightly more urgent action than drafting
				// new ones for a contact, so give it a small weight bump.
				weight: draftCount * 1.1,
			});
		}
	}

	return candidates;
};

const pickTopActions = (
	campaigns: CampaignWithCounts[] | undefined,
	newEmailCount: number
): StrategyAction[] => {
	const candidates = buildCampaignActionCandidates(campaigns);

	if (newEmailCount > 0) {
		candidates.push({
			kind: 'replyEmails',
			count: newEmailCount,
			// New email replies are the highest-urgency action — bump above drafts.
			weight: newEmailCount * 1.5,
		});
	}

	candidates.sort((a, b) => b.weight - a.weight);

	const seen = new Set<string>();
	const unique: StrategyAction[] = [];
	for (const candidate of candidates) {
		const key = `${candidate.kind}-${candidate.campaign?.id ?? 'none'}`;
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push(candidate);
		if (unique.length >= 2) break;
	}

	unique.push({
		kind: 'searchContacts',
		count: 0,
		weight: 0,
	});

	return unique;
};

const actionLabel = (action: StrategyAction): string => {
	switch (action.kind) {
		case 'draftMessages':
			return `Draft messages for ${action.count} contact${action.count === 1 ? '' : 's'} in`;
		case 'reviewDrafts':
			return `Review and Send ${action.count} Draft${action.count === 1 ? '' : 's'} in`;
		case 'replyEmails':
			return `Reply to ${action.count} New Email${action.count === 1 ? '' : 's'}`;
		case 'searchContacts':
			return 'Search for new contacts';
	}
};

const actionBackground = (action: StrategyAction, isTop: boolean): string => {
	if (action.kind === 'draftMessages') {
		return isTop
			? 'linear-gradient(90deg, #B59BFF 0%, #8DB7FF 100%)'
			: '#E7E0FF';
	}
	if (action.kind === 'reviewDrafts' || action.kind === 'replyEmails') {
		return isTop ? '#9BE3A6' : '#D6F1BD';
	}
	return '#E9F7E1';
};

type MockEmail = {
	sender: string;
	indexBadge: number;
	campaignName: string;
	subject: string;
	preview: string;
	time: string;
};

const MOCK_EMAILS: MockEmail[] = [
	{
		sender: 'Alex Young',
		indexBadge: 2,
		campaignName: 'Leo',
		subject: 'Exploring Live Jazz Performance at Consequence Media',
		preview: 'Thank you so much for reaching out. However I regret to in',
		time: '9:12am',
	},
	{
		sender: 'Rebecca Adolf',
		indexBadge: 11,
		campaignName: 'Pieces',
		subject: 'Exploring Live Jazz Performance at Consequence Media',
		preview: 'Thank you so much for reaching out. However I regret to in',
		time: 'Dec 12th',
	},
	{
		sender: 'Jordan Vega',
		indexBadge: 3,
		campaignName: 'Orion',
		subject: 'Exploring Live Jazz Performance at Consequence Media',
		preview: 'Thank you so much for reaching out. However I regret to in',
		time: 'Dec 10th',
	},
	{
		sender: 'Sam Roe',
		indexBadge: 5,
		campaignName: 'Capricorn',
		subject: 'Exploring Live Jazz Performance at Consequence Media',
		preview: 'Thank you so much for reaching out. However I regret to in',
		time: 'Dec 9th',
	},
];

const getMockEmails = (count: number): MockEmail[] => {
	const n = Math.max(0, Math.min(count, MOCK_EMAILS.length));
	return MOCK_EMAILS.slice(0, n);
};

const CAMPAIGN_FOLDER_COLORS: Record<string, string> = {
	Leo: '#C5494F',
	Pieces: '#C77BD6',
	Orion: '#5F8FE0',
	Capricorn: '#A56EE5',
};

const getCampaignFolderColor = (name: string): string =>
	CAMPAIGN_FOLDER_COLORS[name] ?? '#C5494F';

const CampaignFolderPill: FC<{ name: string }> = ({ name }) => {
	const folderColor = getCampaignFolderColor(name);
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: '5px',
				width: '80px',
				height: '15px',
				borderRadius: '3px',
				background: '#B9EAF1',
				padding: '0 6px',
				boxSizing: 'border-box',
				fontFamily: 'Inter, sans-serif',
				fontSize: '11px',
				fontWeight: 500,
				color: '#000',
				lineHeight: 1,
				flexShrink: 0,
			}}
		>
			<svg
				width="12"
				height="10"
				viewBox="0 0 12 10"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				style={{ flexShrink: 0 }}
			>
				<rect y="2" width="12" height="8" rx="1" fill={folderColor} />
				<path
					d="M0 1.25C0 0.56 0.56 0 1.25 0H5.25C5.94 0 6.5 0.56 6.5 1.25V2.5H0V1.25Z"
					fill={folderColor}
				/>
			</svg>
			<span
				style={{
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
				}}
			>
				{name}
			</span>
		</span>
	);
};

const formatInboxTime = (value: string | Date | null | undefined): string => {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	const now = new Date();
	const isSameDay = date.toDateString() === now.toDateString();
	if (isSameDay) {
		return date
			.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
			.toLowerCase();
	}
	const month = date.toLocaleDateString('en-US', { month: 'short' });
	const day = date.getDate();
	const suffix = (() => {
		if (day % 100 >= 11 && day % 100 <= 13) return 'th';
		switch (day % 10) {
			case 1:
				return 'st';
			case 2:
				return 'nd';
			case 3:
				return 'rd';
			default:
				return 'th';
		}
	})();
	return `${month} ${day}${suffix}`;
};

const stripBody = (raw: string | null | undefined): string => {
	const withoutHtml = (raw ?? '').replace(/<[^>]*>/g, ' ');
	return withoutHtml.replace(/\s+/g, ' ').trim();
};

const inboundToMockEmail = (
	email: InboundEmailWithRelations,
	indexBadge: number
): MockEmail => {
	const contact = email.contact;
	const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	const sender =
		fullName ||
		contact?.company?.trim() ||
		email.senderName?.trim() ||
		email.sender?.trim() ||
		'Unknown sender';
	const subject = email.subject?.trim() || '(No Subject)';
	const previewRaw =
		stripBody(email.strippedText) ||
		stripBody(email.bodyPlain) ||
		stripBody(email.bodyHtml);
	const campaignName = email.campaign?.name?.trim() || '';
	return {
		sender,
		indexBadge,
		campaignName,
		subject,
		preview: previewRaw,
		time: formatInboxTime(email.receivedAt),
	};
};

const EmailRowContent: FC<{ email: MockEmail }> = ({ email }) => (
	<>
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '6px',
				gridColumn: '1 / 2',
				gridRow: '1 / 2',
			}}
		>
			<span style={{ fontSize: '13px', fontWeight: 600 }}>{email.sender}</span>
			<span style={{ fontSize: '12px', color: '#7A7A7A' }}>{email.indexBadge}</span>
		</div>

		<div
			style={{
				gridColumn: '2 / 3',
				gridRow: '1 / 2',
				fontSize: '13px',
				fontWeight: 500,
				whiteSpace: 'nowrap',
				overflow: 'hidden',
				textOverflow: 'ellipsis',
			}}
		>
			{email.subject}
		</div>

		<div
			style={{
				gridColumn: '3 / 4',
				gridRow: '1 / 2',
				fontSize: '12px',
				color: '#7A7A7A',
				whiteSpace: 'nowrap',
			}}
		>
			{email.time}
		</div>

		<div
			style={{
				gridColumn: '1 / 2',
				gridRow: '2 / 3',
				display: 'flex',
				alignItems: 'center',
			}}
		>
			{email.campaignName && <CampaignFolderPill name={email.campaignName} />}
		</div>

		<div
			style={{
				gridColumn: '2 / 4',
				gridRow: '2 / 3',
				fontSize: '12px',
				color: '#9A9A9A',
				whiteSpace: 'nowrap',
				overflow: 'hidden',
				textOverflow: 'ellipsis',
			}}
		>
			{email.preview}
		</div>
	</>
);

type MockContact = {
	name: string;
	company: string;
};

const MOCK_CONTACTS: MockContact[] = [
	{ name: 'Alex Young', company: 'Trigger Media Group' },
	{ name: 'Alex Young', company: 'Trigger Media Group' },
	{ name: 'Jordan Vega', company: 'Orion Records' },
	{ name: 'Sam Roe', company: 'Capricorn Sound' },
];

const DRAFT_CARD_COLORS = ['#B9BBF1', '#B7E5FF', '#FAF0C7', '#FFD6E0'];

type DraftSlot = {
	contact: MockContact;
	top: number;
	left: number;
	colorIndex: 0 | 1;
};

const buildDraftSlots = (count: number): DraftSlot[] => {
	const slots: DraftSlot[] = [];
	const pick = (i: number) => MOCK_CONTACTS[i % MOCK_CONTACTS.length];

	if (count >= 10) {
		// 10+ layout: row 1 (3 cards) + row 2 shifted 69px left (4 cards,
		// 27px below) + row 3 shifted 5px right (3 cards, another 27px down,
		// mostly clipped by the bottom mask).
		const row1Left = 18;
		const row1Top = 34;
		const colStep = 185 + 15; // 200

		// Row 1
		for (let c = 0; c < 3; c++) {
			slots.push({
				contact: pick(c),
				top: row1Top,
				left: row1Left + c * colStep,
				colorIndex: c === 0 ? 0 : 1,
			});
		}
		// Row 2 — first and last cards use the darker purple.
		const row2Top = row1Top + 27;
		const row2Left = row1Left - 69;
		for (let c = 0; c < 4; c++) {
			slots.push({
				contact: pick(3 + c),
				top: row2Top,
				left: row2Left + c * colStep,
				colorIndex: c === 0 || c === 3 ? 0 : 1,
			});
		}
		// Row 3
		const row3Top = row2Top + 27;
		const row3Left = row1Left + 5;
		for (let c = 0; c < 3; c++) {
			slots.push({
				contact: pick(7 + c),
				top: row3Top,
				left: row3Left + c * colStep,
				colorIndex: 1,
			});
		}
		return slots;
	}

	// Existing layout for count 1–9.
	const visibleCount = Math.min(Math.max(count, 1), 6);
	const leftMargin = count >= 3 ? 18 : 24;
	const gap = 15;
	for (let i = 0; i < visibleCount; i++) {
		const row = i < 3 ? 0 : 1;
		const col = i % 3;
		slots.push({
			contact: pick(i),
			top: 34 + row * (47 + 6),
			left: leftMargin + col * (185 + gap),
			colorIndex: col === 0 ? 0 : 1,
		});
	}
	return slots;
};

const DraftMessagesTopCard: FC<{
	count: number;
	campaignName?: string;
}> = ({ count, campaignName }) => {
	const slots = buildDraftSlots(count);

	const containerMask =
		'linear-gradient(180deg, #000 0%, #000 70%, rgba(0,0,0,0) 86%)';

	return (
		<div
			style={{
				position: 'relative',
				width: '622px',
				maxWidth: '100%',
				height: '113px',
				borderRadius: '6.389px',
				opacity: 0.8,
				background:
					'linear-gradient(179deg, #BEA9ED 62.44%, rgba(169, 218, 237, 0.00) 120.01%)',
				overflow: 'hidden',
				flexShrink: 0,
				WebkitMaskImage: containerMask,
				maskImage: containerMask,
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: '8px',
					left: '24px',
					right: '24px',
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
					color: '#000',
					fontFamily: 'Inter, sans-serif',
					fontSize: '15.546px',
					fontStyle: 'normal',
					fontWeight: 500,
					lineHeight: '20.728px',
				}}
			>
				<span>
					Draft messages for {count} contact{count === 1 ? '' : 's'} in
				</span>
				{campaignName && <CampaignFolderPill name={campaignName} />}
			</div>

			{slots.map((slot, i) => {
				return (
					<div
						key={`draft-contact-${i}`}
						style={{
							position: 'absolute',
							top: `${slot.top}px`,
							left: `${slot.left}px`,
							width: '185px',
							height: '47px',
							borderRadius: '8px',
							border: '2px solid #FFF',
							background: DRAFT_CARD_COLORS[slot.colorIndex],
							padding: '4px 10px',
							boxSizing: 'border-box',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							gap: '2px',
							fontFamily: 'Inter, sans-serif',
							color: '#000',
						}}
					>
						<div
							style={{
								fontSize: '13px',
								fontWeight: 700,
								lineHeight: '16px',
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
							}}
						>
							{slot.contact.name}
						</div>
						<div
							style={{
								fontSize: '13px',
								fontWeight: 400,
								lineHeight: '16px',
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
							}}
						>
							{slot.contact.company}
						</div>
					</div>
				);
			})}
		</div>
	);
};

type CategoryPillSpec = {
	label: string;
	background: string;
	icon: React.ReactNode;
};

const getContactCategoryPill = (
	contact: EmailWithRelations['contact']
): CategoryPillSpec | null => {
	const c = contact as unknown as { headline?: string; title?: string } | null;
	const headline = (c?.headline || c?.title || '').trim();
	if (!headline) return null;

	if (isMusicVenueTitle(headline)) {
		return {
			label: 'Music Venue',
			background: '#B7E5FF',
			icon: <MusicVenuesIcon size={14} className="flex-shrink-0" />,
		};
	}
	if (isRestaurantTitle(headline)) {
		return {
			label: 'Restaurant',
			background: '#C3FBD1',
			icon: <RestaurantsIcon size={14} className="flex-shrink-0" />,
		};
	}
	if (isCoffeeShopTitle(headline)) {
		return {
			label: 'Coffee',
			background: '#D6F1BD',
			icon: <CoffeeShopsIcon size={12} className="flex-shrink-0" />,
		};
	}
	if (isWeddingPlannerTitle(headline)) {
		return {
			label: 'Wedding Planner',
			background: '#FFF2BC',
			icon: <WeddingPlannersIcon size={14} className="flex-shrink-0" />,
		};
	}
	if (isWeddingVenueTitle(headline)) {
		return {
			label: 'Wedding Venue',
			background: '#FFF2BC',
			icon: <WeddingPlannersIcon size={14} className="flex-shrink-0" />,
		};
	}
	if (isWineBeerSpiritsTitle(headline)) {
		return {
			label: 'W.B.S.',
			background: '#BFC4FF',
			icon: <WineBeerSpiritsIcon size={14} className="flex-shrink-0" />,
		};
	}
	return null;
};

const CategoryPill: FC<{ spec: CategoryPillSpec }> = ({ spec }) => (
	<span
		style={{
			display: 'inline-flex',
			alignItems: 'center',
			gap: '4px',
			height: '15px',
			padding: '0 6px',
			borderRadius: '7.5px',
			background: spec.background,
			fontSize: '10px',
			fontWeight: 500,
			color: '#000',
			lineHeight: 1,
			whiteSpace: 'nowrap',
		}}
	>
		{spec.icon}
		{spec.label}
	</span>
);

const getContactDisplayName = (contact: EmailWithRelations['contact']): string => {
	const c = contact as unknown as {
		firstName?: string | null;
		lastName?: string | null;
		company?: string | null;
		email?: string | null;
	} | null;
	if (!c) return '';
	const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim();
	return fullName || c.company?.trim() || c.email?.trim() || '';
};

const stripPreviewBody = (raw: string | null | undefined): string => {
	const withoutHtml = (raw ?? '').replace(/<[^>]*>/g, ' ');
	return withoutHtml.replace(/\s+/g, ' ').trim();
};

const DraftRowContent: FC<{ draft: EmailWithRelations }> = ({ draft }) => {
	const contact = draft.contact;
	const name = getContactDisplayName(contact);
	const c = contact as unknown as { company?: string | null; state?: string | null } | null;
	const company = c?.company?.trim() || '';
	const stateAbbr = c?.state
		? getStateAbbreviation(c.state)?.trim().toUpperCase() || ''
		: '';
	const stateFullName = stateAbbr
		? US_STATES.find((s) => s.abbr === stateAbbr)?.name || ''
		: '';
	const subject = draft.subject?.trim() || '(No Subject)';
	const message = (draft as unknown as { message?: string | null }).message;
	const preview = stripPreviewBody(message);
	const categoryPill = getContactCategoryPill(contact);

	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: '290px 1fr',
				gridTemplateRows: '20px 20px',
				columnGap: '12px',
				rowGap: '2px',
				width: '100%',
				height: '100%',
				alignItems: 'center',
				fontFamily: 'Inter, sans-serif',
				color: '#1A1A1A',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '10px',
					gridColumn: '1 / 2',
					gridRow: '1 / 2',
					minWidth: 0,
				}}
			>
				<span
					style={{
						fontSize: '13px',
						fontWeight: 600,
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
				>
					{name}
				</span>
				{company && (
					<span
						style={{
							fontSize: '13px',
							color: '#1A1A1A',
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
						}}
					>
						{company}
					</span>
				)}
			</div>

			<div
				style={{
					gridColumn: '2 / 3',
					gridRow: '1 / 2',
					fontSize: '13px',
					fontWeight: 600,
					whiteSpace: 'nowrap',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
				}}
			>
				{subject}
			</div>

			<div
				style={{
					gridColumn: '1 / 2',
					gridRow: '2 / 3',
					display: 'flex',
					alignItems: 'center',
					gap: '6px',
				}}
			>
				{categoryPill && <CategoryPill spec={categoryPill} />}
				{stateAbbr ? (
					<>
						<span
							className="inline-flex items-center justify-center"
							style={{
								width: '29px',
								height: '15px',
								borderRadius: '6px',
								border: '1px solid #000',
								color: '#000',
								fontFamily: 'Inter, sans-serif',
								fontSize: '12.184px',
								fontStyle: 'normal',
								fontWeight: 400,
								lineHeight: '14.68px',
								backgroundColor:
									stateBadgeColorMap[stateAbbr] || 'transparent',
							}}
						>
							{stateAbbr}
						</span>
						{stateFullName && (
							<span style={{ fontSize: '12px', color: '#1A1A1A' }}>
								{stateFullName}
							</span>
						)}
					</>
				) : null}
			</div>

			<div
				style={{
					gridColumn: '2 / 3',
					gridRow: '2 / 3',
					fontSize: '12px',
					color: '#5A5A5A',
					whiteSpace: 'nowrap',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
				}}
			>
				{preview}
			</div>
		</div>
	);
};

// Used as a placeholder when no real draft data is available (e.g., in the
// debug-state mock mode), so the layout still renders rows we can review.
const MOCK_DRAFT_ROW = {
	id: -1,
	subject: 'Exploring Live Jazz Performance at Consequence Media',
	message:
		'Hi, I hope this email finds you well! I am writing to introduce myself...',
	contact: {
		firstName: 'Ann',
		lastName: 'Ovidio',
		company: 'The Umbrella',
		state: 'New York',
		headline: 'Music Venue',
	},
} as unknown as EmailWithRelations;

// Compact 206×89 card used by the 6+ grid layout. 2px white stroke around
// the cream content; top 3px stripe is yellow for the first 70px (of the
// inner content area) and white the rest of the way.
const GridDraftCard: FC<{
	draft: EmailWithRelations;
	top: number;
	left: number;
}> = ({ draft, top, left }) => {
	const contact = draft.contact;
	const name = getContactDisplayName(contact);
	const c = contact as unknown as { company?: string | null; state?: string | null } | null;
	const company = c?.company?.trim() || '';
	const stateAbbr = c?.state
		? getStateAbbreviation(c.state)?.trim().toUpperCase() || ''
		: '';
	const stateFullName = stateAbbr
		? US_STATES.find((s) => s.abbr === stateAbbr)?.name || ''
		: '';
	const subject = draft.subject?.trim() || '(No Subject)';
	const message = (draft as unknown as { message?: string | null }).message;
	const preview = stripPreviewBody(message);
	const categoryPill = getContactCategoryPill(contact);

	return (
		<div
			style={{
				position: 'absolute',
				top: `${top}px`,
				left: `${left}px`,
				width: '206px',
				height: '89px',
				borderRadius: '6px',
				border: '2px solid #FFF',
				background: '#FFF7E6',
				boxSizing: 'border-box',
				overflow: 'hidden',
				fontFamily: 'Inter, sans-serif',
				color: '#1A1A1A',
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					height: '3px',
					background:
						'linear-gradient(90deg, #FFE3AA 0px, #FFE3AA 70px, #FFFFFF 70px, #FFFFFF 100%)',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: '3px',
					left: 0,
					right: 0,
					bottom: 0,
					padding: '5px 9px 4px 9px',
					boxSizing: 'border-box',
					display: 'flex',
					flexDirection: 'column',
					gap: '2px',
					minWidth: 0,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '6px',
						minWidth: 0,
						lineHeight: '16px',
					}}
				>
					<span
						style={{
							fontSize: '13px',
							fontWeight: 700,
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							flexShrink: 0,
						}}
					>
						{name}
					</span>
					{company && (
						<span
							style={{
								fontSize: '13px',
								fontWeight: 400,
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
							}}
						>
							{company}
						</span>
					)}
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
					{categoryPill && <CategoryPill spec={categoryPill} />}
					{stateAbbr && (
						<>
							<span
								className="inline-flex items-center justify-center"
								style={{
									width: '26px',
									height: '14px',
									borderRadius: '5px',
									border: '1px solid #000',
									color: '#000',
									fontFamily: 'Inter, sans-serif',
									fontSize: '10.5px',
									fontWeight: 400,
									lineHeight: '12px',
									backgroundColor:
										stateBadgeColorMap[stateAbbr] || 'transparent',
								}}
							>
								{stateAbbr}
							</span>
							{stateFullName && (
								<span style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
									{stateFullName}
								</span>
							)}
						</>
					)}
				</div>
				<div
					style={{
						fontSize: '13px',
						fontWeight: 700,
						lineHeight: '16px',
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
				>
					{subject}
				</div>
				<div
					style={{
						fontSize: '12px',
						color: '#5A5A5A',
						lineHeight: '15px',
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
				>
					{preview}
				</div>
			</div>
		</div>
	);
};

// Grid layout used when count >= 6: row 1 has 3 cards (first card at top 34,
// left 10; subsequent cards spaced 20px to the right), row 2 has 4 cards
// starting 73px further left and 17px below row 1 (same 20px gap).
const REVIEW_DRAFTS_GRID_SLOTS: { top: number; left: number }[] = (() => {
	const cardWidth = 206;
	const gap = 20;
	const step = cardWidth + gap; // 226
	const row1Top = 34;
	const row1Left = 10;
	const row2Top = row1Top + 89 + 17; // 140
	const row2Left = row1Left - 73; // -63
	const slots: { top: number; left: number }[] = [];
	for (let c = 0; c < 3; c++) {
		slots.push({ top: row1Top, left: row1Left + c * step });
	}
	for (let c = 0; c < 4; c++) {
		slots.push({ top: row2Top, left: row2Left + c * step });
	}
	return slots;
})();

// Compact 142×59 card used by the 10+ layout. Same construction as
// GridDraftCard but scaled down — smaller fonts/pills so 4 content lines
// still fit inside.
const SmallGridDraftCard: FC<{
	draft: EmailWithRelations;
	top: number;
	left: number;
}> = ({ draft, top, left }) => {
	const contact = draft.contact;
	const name = getContactDisplayName(contact);
	const c = contact as unknown as { company?: string | null; state?: string | null } | null;
	const company = c?.company?.trim() || '';
	const stateAbbr = c?.state
		? getStateAbbreviation(c.state)?.trim().toUpperCase() || ''
		: '';
	const stateFullName = stateAbbr
		? US_STATES.find((s) => s.abbr === stateAbbr)?.name || ''
		: '';
	const subject = draft.subject?.trim() || '(No Subject)';
	const message = (draft as unknown as { message?: string | null }).message;
	const preview = stripPreviewBody(message);
	const categoryPill = getContactCategoryPill(contact);

	return (
		<div
			style={{
				position: 'absolute',
				top: `${top}px`,
				left: `${left}px`,
				width: '142px',
				height: '59px',
				borderRadius: '6px',
				border: '2px solid #FFF',
				background: '#FFF7E6',
				boxSizing: 'border-box',
				overflow: 'hidden',
				fontFamily: 'Inter, sans-serif',
				color: '#1A1A1A',
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					height: '3px',
					background:
						'linear-gradient(90deg, #FFE3AA 0px, #FFE3AA 50px, #FFFFFF 50px, #FFFFFF 100%)',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: '3px',
					left: 0,
					right: 0,
					bottom: 0,
					padding: '3px 6px 2px 6px',
					boxSizing: 'border-box',
					display: 'flex',
					flexDirection: 'column',
					gap: '1px',
					minWidth: 0,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '4px',
						minWidth: 0,
						lineHeight: '12px',
					}}
				>
					<span
						style={{
							fontSize: '10px',
							fontWeight: 700,
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							flexShrink: 0,
						}}
					>
						{name}
					</span>
					{company && (
						<span
							style={{
								fontSize: '10px',
								fontWeight: 400,
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
							}}
						>
							{company}
						</span>
					)}
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
					{categoryPill && (
						<span
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: '2px',
								height: '11px',
								padding: '0 4px',
								borderRadius: '5.5px',
								background: categoryPill.background,
								fontSize: '8px',
								fontWeight: 500,
								color: '#000',
								lineHeight: 1,
								whiteSpace: 'nowrap',
							}}
						>
							{categoryPill.icon}
							{categoryPill.label}
						</span>
					)}
					{stateAbbr && (
						<>
							<span
								className="inline-flex items-center justify-center"
								style={{
									minWidth: '19px',
									height: '11px',
									borderRadius: '4px',
									border: '1px solid #000',
									color: '#000',
									fontFamily: 'Inter, sans-serif',
									fontSize: '8.5px',
									fontWeight: 400,
									lineHeight: '10px',
									padding: '0 3px',
									backgroundColor:
										stateBadgeColorMap[stateAbbr] || 'transparent',
								}}
							>
								{stateAbbr}
							</span>
							{stateFullName && (
								<span
									style={{
										fontSize: '9px',
										whiteSpace: 'nowrap',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
									}}
								>
									{stateFullName}
								</span>
							)}
						</>
					)}
				</div>
				<div
					style={{
						fontSize: '10px',
						fontWeight: 700,
						lineHeight: '12px',
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
				>
					{subject}
				</div>
				<div
					style={{
						fontSize: '9px',
						color: '#5A5A5A',
						lineHeight: '11px',
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
				>
					{preview}
				</div>
			</div>
		</div>
	);
};

// Compact grid layout used when count >= 10: row 1 starts at top 34, with
// 142×59 cards spaced 14px apart (step 156). The first card has its left
// 35px clipped (left = -35) so the row reads as a stream of cards. Row 2
// is 12px below row 1 (top 105) and shifted 50px further left (left = -85)
// for a brick offset against row 1.
const REVIEW_DRAFTS_COMPACT_GRID_SLOTS: { top: number; left: number }[] = (() => {
	const cardWidth = 142;
	const gap = 14;
	const step = cardWidth + gap; // 156
	const row1Top = 34;
	const row1Left = -35; // first 35px of card 1 clipped
	const row2Top = row1Top + 59 + 12; // 105
	const row2Left = row1Left - 50; // -85
	const slots: { top: number; left: number }[] = [];
	for (let c = 0; c < 5; c++) {
		slots.push({ top: row1Top, left: row1Left + c * step });
	}
	for (let c = 0; c < 5; c++) {
		slots.push({ top: row2Top, left: row2Left + c * step });
	}
	return slots;
})();

const ReviewDraftsTopCard: FC<{
	count: number;
	campaignId?: number;
	campaignName?: string;
}> = ({ count, campaignId, campaignName }) => {
	const { data: drafts } = useGetEmails({
		enabled: !!campaignId,
		filters: campaignId
			? { campaignId, status: 'draft' as const }
			: undefined,
	});
	const realDrafts = drafts ?? [];
	const isCompactGridLayout = count >= 10;
	const isGridLayout = count >= 6 && !isCompactGridLayout;
	const stackedRowCount = count >= 2 ? 2 : 1;
	// Compact grid (10+): 10 small cards (5 + 5). Grid (6–9): 7 medium cards
	// (3 + 4). Stacked (1–5): one row when count = 1, two rows when count >= 2.
	const targetCount = isCompactGridLayout
		? REVIEW_DRAFTS_COMPACT_GRID_SLOTS.length
		: isGridLayout
			? REVIEW_DRAFTS_GRID_SLOTS.length
			: stackedRowCount;
	const visibleDrafts: EmailWithRelations[] = Array.from(
		{ length: targetCount },
		(_, i) => realDrafts[i] ?? realDrafts[0] ?? MOCK_DRAFT_ROW
	);

	// Stacked (1–5): 169px green container, aggressive fade so row 2 just peeks
	// through. Grid (6–9): 175px green container, softer fade. Compact grid
	// (10+): 145px container with a yellow background (matches the cards' top
	// accent color), softer fade revealing row 2's top portion.
	const containerHeight = isCompactGridLayout ? 145 : isGridLayout ? 175 : 169;
	const containerBackground = isCompactGridLayout ? '#FFE3AA' : '#C6EDA9';
	const containerMask = isCompactGridLayout
		? 'linear-gradient(180deg, #000 0%, #000 80%, rgba(0,0,0,0) 100%)'
		: isGridLayout
			? 'linear-gradient(180deg, #000 0%, #000 85%, rgba(0,0,0,0) 100%)'
			: 'linear-gradient(180deg, #000 0%, #000 60%, rgba(0,0,0,0) 75%)';

	return (
		<div
			style={{
				position: 'relative',
				width: '622px',
				maxWidth: '100%',
				height: `${containerHeight}px`,
				borderRadius: '6.389px',
				background: containerBackground,
				overflow: 'hidden',
				flexShrink: 0,
				WebkitMaskImage: containerMask,
				maskImage: containerMask,
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: '8px',
					left: '50%',
					transform: 'translateX(-50%)',
					width: '603px',
					maxWidth: 'calc(100% - 12px)',
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
					color: '#000',
					fontFamily: 'Inter, sans-serif',
					fontSize: '15.546px',
					fontWeight: 500,
					lineHeight: '20.728px',
					paddingLeft: '4px',
					boxSizing: 'border-box',
				}}
			>
				<span>
					Review and Send {count} Draft{count === 1 ? '' : 's'} in
				</span>
				{campaignName && <CampaignFolderPill name={campaignName} />}
			</div>

			{isCompactGridLayout
				? visibleDrafts.map((draft, i) => {
						const slot = REVIEW_DRAFTS_COMPACT_GRID_SLOTS[i];
						return (
							<SmallGridDraftCard
								key={`compact-grid-draft-${i}-${draft.id ?? 'mock'}`}
								draft={draft}
								top={slot.top}
								left={slot.left}
							/>
						);
				  })
				: isGridLayout
				? visibleDrafts.map((draft, i) => {
						const slot = REVIEW_DRAFTS_GRID_SLOTS[i];
						return (
							<GridDraftCard
								key={`grid-draft-${i}-${draft.id ?? 'mock'}`}
								draft={draft}
								top={slot.top}
								left={slot.left}
							/>
						);
				  })
				: visibleDrafts.map((draft, i) => {
				const top = 40 + i * (52 + 8);
				return (
					<div
						key={`draft-row-${i}-${draft.id ?? 'mock'}`}
						style={{
							position: 'absolute',
							top: `${top}px`,
							left: '50%',
							transform: 'translateX(-50%)',
							width: '603px',
							maxWidth: 'calc(100% - 12px)',
							height: '52px',
							borderRadius: '7.798px',
							background: '#FFF7E6',
							overflow: 'hidden',
						}}
					>
						{/* Top 5px accent strip: yellow for the first 206px, then white. */}
						<div
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
								height: '5px',
								background:
									'linear-gradient(90deg, #FFE3AA 0px, #FFE3AA 206px, #FFFFFF 206px, #FFFFFF 100%)',
							}}
						/>
						<div
							style={{
								position: 'absolute',
								top: '5px',
								left: 0,
								right: 0,
								bottom: 0,
								padding: '4px 12px 6px 14px',
								boxSizing: 'border-box',
								display: 'flex',
								alignItems: 'center',
							}}
						>
							<DraftRowContent draft={draft} />
						</div>
					</div>
				);
			})}
		</div>
	);
};

const STACKED_COLORS = ['#B7E5FF', '#B9BBF1', '#FAF0C7'];

const StackedReplyEmailCards: FC<{ emails: MockEmail[] }> = ({ emails }) => {
	const slots = emails.slice(0, 3);
	while (slots.length < 3) {
		slots.push(MOCK_EMAILS[slots.length % MOCK_EMAILS.length]);
	}

	return (
		<>
			{slots.map((email, i) => {
				const top = 40 + i * 24;
				const baseLeft = (622 - 603) / 2;
				const left = baseLeft + i * 47;
				return (
					<div
						key={`stack-${i}`}
						style={{
							position: 'absolute',
							top: `${top}px`,
							left: `${left}px`,
							width: '603px',
							height: '48px',
							borderRadius: '8px',
							border: '2px solid #FFF',
							background: STACKED_COLORS[i],
							display: 'grid',
							gridTemplateColumns: '110px 1fr auto',
							gridTemplateRows: 'auto auto',
							gridColumnGap: '8px',
							gridRowGap: '2px',
							alignItems: 'center',
							padding: '6px 10px',
							boxSizing: 'border-box',
							fontFamily: 'Inter, sans-serif',
							color: '#1A1A1A',
							zIndex: i + 1,
						}}
					>
						<EmailRowContent email={email} />
					</div>
				);
			})}
		</>
	);
};

const ReplyEmailsTopCard: FC<{
	count: number;
	realEmails?: InboundEmailWithRelations[];
}> = ({ count, realEmails }) => {
	const emails: MockEmail[] = realEmails && realEmails.length > 0
		? realEmails.slice(0, 4).map((e, i) => inboundToMockEmail(e, i + 1))
		: getMockEmails(Math.min(count, MOCK_EMAILS.length));
	const isStacked = count >= 3;

	// Cut the visible area at 112px (≈72% of 155) in both modes so the box
	// always clips to the same height.
	const containerMask =
		'linear-gradient(180deg, #000 0%, #000 60%, rgba(0,0,0,0) 72%)';

	return (
		<div
			style={{
				position: 'relative',
				width: '622px',
				maxWidth: '100%',
				height: '155px',
				borderRadius: '6.389px',
				background:
					'linear-gradient(179deg, #A9EDD2 62.44%, rgba(169, 237, 210, 0.00) 120.01%)',
				overflow: 'hidden',
				flexShrink: 0,
				WebkitMaskImage: containerMask,
				maskImage: containerMask,
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: '8px',
					left: '50%',
					transform: 'translateX(-50%)',
					width: '603px',
					maxWidth: 'calc(100% - 12px)',
					color: '#000',
					textAlign: 'left',
					fontFamily: 'Inter, sans-serif',
					fontSize: '15.546px',
					fontStyle: 'normal',
					fontWeight: 500,
					lineHeight: '20.728px',
					paddingLeft: '4px',
					boxSizing: 'border-box',
				}}
			>
				Reply to {count} New Email{count === 1 ? '' : 's'}
			</div>

			{isStacked ? (
				<StackedReplyEmailCards emails={emails} />
			) : (
				<div
					style={{
						position: 'absolute',
						top: '31px',
						left: 0,
						right: 0,
						bottom: 0,
					}}
				>
					{emails.map((email, i) => {
						const top = i * (48 + 6);
						return (
							<div
								key={`${email.sender}-${i}`}
								style={{
									position: 'absolute',
									top: `${top}px`,
									left: '50%',
									transform: 'translateX(-50%)',
									width: '603px',
									maxWidth: 'calc(100% - 12px)',
									height: '48px',
									borderRadius: '6.389px',
									background: '#F6F6F6',
									display: 'grid',
									gridTemplateColumns: '110px 1fr auto',
									gridTemplateRows: 'auto auto',
									gridColumnGap: '8px',
									gridRowGap: '2px',
									alignItems: 'center',
									padding: '6px 10px',
									boxSizing: 'border-box',
									fontFamily: 'Inter, sans-serif',
									color: '#1A1A1A',
								}}
							>
								<EmailRowContent email={email} />
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

const DECORATIVE_MAP_MOOD_CONFIG = getMoodConfig('normal');
const DECORATIVE_MAP_NIGHT_T = computeMoodVisualNightT(0, DECORATIVE_MAP_MOOD_CONFIG);
const DECORATIVE_INSET_ZOOM = 1.75;
const DECORATIVE_INSET_CENTER_LAT = DASHBOARD_DECORATIVE_CENTER[1] + 18;
const DECORATIVE_INSET_OFFSET_PX: [number, number] = [220, 90];

const DecorativeGlobeMap: FC = () => {
	const clipRef = useRef<HTMLDivElement | null>(null);
	const viewportMapRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const clipNode = clipRef.current;
		const mapNode = viewportMapRef.current;
		if (!clipNode || !mapNode) return;

		const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
		if (!token) return;
		mapboxgl.accessToken = token;

		let currentLng = getDashboardGlobeSpinLng();
		const baseLat = DECORATIVE_INSET_CENTER_LAT;
		let viewportWidth = 0;
		let viewportHeight = 0;
		let map: mapboxgl.Map | null = null;

		const syncViewportFrame = () => {
			const rect = clipNode.getBoundingClientRect();
			const width = Math.max(window.innerWidth, 1);
			const height = Math.max(window.innerHeight, 1);
			const shouldResizeMap = width !== viewportWidth || height !== viewportHeight;

			viewportWidth = width;
			viewportHeight = height;

			mapNode.style.width = `${width}px`;
			mapNode.style.height = `${height}px`;
			mapNode.style.transform = `translate(${-rect.left}px, ${-rect.top}px)`;

			if (shouldResizeMap && map) {
				try {
					map.resize();
					map.easeTo({
						center: [currentLng, baseLat],
							zoom: DECORATIVE_INSET_ZOOM,
							pitch: DASHBOARD_DECORATIVE_PITCH,
							bearing: 0,
							offset: DECORATIVE_INSET_OFFSET_PX,
							duration: 0,
						});
				} catch {
					// Non-fatal — map may be mid-teardown.
				}
			}
		};

		const applyDecorativeMapStyle = (mapInstance: mapboxgl.Map) => {
			applyFreeTrialMapVisualTuning(mapInstance);
			ensureWorldLandFill(mapInstance);
			applyNightLandPalette(mapInstance, DECORATIVE_MAP_NIGHT_T);
			applyMapboxFogForMoodAndNight(
				mapInstance,
				DECORATIVE_MAP_MOOD_CONFIG,
				DECORATIVE_MAP_NIGHT_T
			);
			applyMurmurGlobeLighting(mapInstance);
		};

		syncViewportFrame();

		map = new mapboxgl.Map({
			container: mapNode,
			style: MAPBOX_STYLE,
			center: [currentLng, baseLat],
			zoom: DECORATIVE_INSET_ZOOM,
			pitch: DASHBOARD_DECORATIVE_PITCH,
			bearing: 0,
			minZoom: DECORATIVE_INSET_ZOOM,
			maxZoom: DECORATIVE_INSET_ZOOM,
			interactive: false,
			attributionControl: false,
			dragRotate: false,
			pitchWithRotate: false,
			touchPitch: false,
		});

		const syncCamera = (duration = 0) => {
			if (!map) return;
			try {
				map.easeTo({
					center: [currentLng, baseLat],
					zoom: DECORATIVE_INSET_ZOOM,
					pitch: DASHBOARD_DECORATIVE_PITCH,
					bearing: 0,
					offset: DECORATIVE_INSET_OFFSET_PX,
					duration,
					easing: (n) => n,
				});
			} catch {
				// Non-fatal — map may be mid-teardown.
			}
		};

		map.on('style.load', () => {
			if (!map) return;
			applyDecorativeMapStyle(map);
			syncCamera(0);
		});

		map.on('load', () => {
			if (!map) return;
			syncViewportFrame();
			applyDecorativeMapStyle(map);
			syncCamera(0);
		});

		// Follow the dashboard's spin loop — each tick the main globe publishes
		// its new target longitude here, and we ease to the same point over the
		// same step duration so the two cameras stay synchronized.
		const unsubscribe = subscribeDashboardGlobeSpin((lng) => {
			currentLng = lng;
			syncCamera(DASHBOARD_GLOBE_SPIN_STEP_MS);
		});

		const observer = new ResizeObserver(syncViewportFrame);
		observer.observe(clipNode);
		window.addEventListener('resize', syncViewportFrame);
		window.addEventListener('scroll', syncViewportFrame, true);

		const frameRaf = window.requestAnimationFrame(syncViewportFrame);
		const settleTimer = window.setTimeout(syncViewportFrame, 0);

		return () => {
			unsubscribe();
			observer.disconnect();
			window.removeEventListener('resize', syncViewportFrame);
			window.removeEventListener('scroll', syncViewportFrame, true);
			window.cancelAnimationFrame(frameRaf);
			window.clearTimeout(settleTimer);
			try {
				map?.remove();
			} catch {
				// Non-fatal.
			}
			map = null;
		};
	}, []);

	return (
		<>
			<style>{`
				.decorative-globe-map .mapboxgl-ctrl-bottom-left,
				.decorative-globe-map .mapboxgl-ctrl-bottom-right,
				.decorative-globe-map .mapboxgl-ctrl-top-left,
				.decorative-globe-map .mapboxgl-ctrl-top-right { display: none !important; }
			`}</style>
			<div
				className="decorative-globe-map"
				ref={clipRef}
				style={{
					position: 'absolute',
					inset: 0,
					width: '100%',
					height: '100%',
					overflow: 'hidden',
				}}
			>
				<div
					ref={viewportMapRef}
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						willChange: 'transform',
					}}
				/>
			</div>
		</>
	);
};

// Top-card variant used when 'searchContacts' is the highest-priority action
// (i.e. no drafts to review and no inbound emails to reply to). 622×169 with
// a darker green header bar over a lighter green body, hosting a 606×128
// inset "window" that mirrors the dashboard's decorative spinning globe.
const SearchContactsTopCard: FC = () => (
	<div
		style={{
			position: 'relative',
			width: '622px',
			maxWidth: '100%',
			height: '169px',
			borderRadius: '6.39px',
			background: '#C6EDA9',
			overflow: 'hidden',
			flexShrink: 0,
		}}
	>
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				right: 0,
				height: '28px',
				background: '#94D78E',
				display: 'flex',
				alignItems: 'center',
				paddingLeft: '12px',
				boxSizing: 'border-box',
				fontFamily: 'Inter, sans-serif',
				fontSize: '15.546px',
				fontWeight: 500,
				lineHeight: '20.728px',
				color: '#1A1A1A',
			}}
		>
			Search for new contacts
		</div>

		{/* Inset window: a dedicated decorative Mapbox map that mirrors the
		    main dashboard background globe (same camera + same spin) so this
		    reads as the *same* globe the user sees behind the strategy panel. */}
		<div
			style={{
				position: 'absolute',
				top: '34px',
				left: '8px',
				width: '606px',
				height: '128px',
				borderRadius: '6px',
				overflow: 'hidden',
				pointerEvents: 'none',
			}}
		>
			<DecorativeGlobeMap />
		</div>
	</div>
);

// Top-card element heights, kept in sync with the height: '…' values used
// inside each *TopCard component above. Used to place subordinate pills below
// the top card's visible content instead of below its transparent mask tail.
const getTopCardHeight = (action: StrategyAction): number => {
	if (action.kind === 'draftMessages') return 113;
	if (action.kind === 'replyEmails') return 155;
	if (action.kind === 'reviewDrafts') {
		if (action.count >= 10) return 145;
		if (action.count >= 6) return 175;
		return 169;
	}
	return 169; // searchContacts
};

// Y-coordinate (in top-card local space) where the container's fade
// mask reaches 0 alpha — i.e. where the top card AND everything inside
// it (positioned cards, emails, drafts) becomes fully transparent.
// CSS masks apply to the whole masked element, so absolute children
// fade out at the same gradient stops. Using this point as the
// "visible end" (rather than the bottom of any specific inner card)
// keeps the secondary pill below the entire faded silhouette of the
// top card and prevents it from riding up over content that's still
// half-visible inside the fade region.
const getTopCardVisibleEnd = (action: StrategyAction): number => {
	if (action.kind === 'draftMessages') return 97; // mask 70–86% of 113
	if (action.kind === 'replyEmails') return 112; // mask 60–72% of 155
	if (action.kind === 'reviewDrafts') {
		// Grid masks end at 100%, so there's no transparent tail at all —
		// the pill sits with its default 17px margin below the element.
		if (action.count >= 10) return 145; // compact-grid mask 80–100% of 145
		if (action.count >= 6) return 175; // grid mask 85–100% of 175
		return 127; // stacked mask 60–75% of 169
	}
	return 169; // searchContacts: no mask
};

const DEFAULT_GAP_TOP_PILL_PX = 17;
const DEFAULT_GAP_BETWEEN_PILLS_PX = 24;

const computeItemMarginTops = (actions: StrategyAction[]): number[] => {
	if (actions.length === 1) return [0];

	const tail = getTopCardHeight(actions[0]) - getTopCardVisibleEnd(actions[0]);
	const topPillGap = DEFAULT_GAP_TOP_PILL_PX - tail;

	if (actions.length === 2) {
		// Lift the secondary pill into the top card's fade tail so it sits
		// ~17px below the visible content, not 17px below the element bottom.
		return [0, topPillGap];
	}

	return [0, topPillGap, DEFAULT_GAP_BETWEEN_PILLS_PX];
};

type Props = {
	className?: string;
	mockState?: StrategyMockState;
};

export const DashboardStrategyBox: FC<Props> = ({ className, mockState }) => {
	const router = useRouter();
	const { data: realCampaigns } = useGetCampaigns();
	const { data: inboundEmails } = useGetInboundEmails({ enabled: true });
	const realNewEmailCount = inboundEmails?.length ?? 0;

	const { campaigns, newEmailCount } = useMemo(() => {
		if (mockState?.campaigns && mockState.campaigns.length > 0) {
			return {
				campaigns: mockState.campaigns.map(mockToCampaign),
				newEmailCount: mockState.newEmailCount ?? 0,
			};
		}
		return {
			campaigns: (realCampaigns as CampaignWithCounts[] | undefined) ?? [],
			newEmailCount: mockState?.newEmailCount ?? realNewEmailCount,
		};
	}, [mockState, realCampaigns, realNewEmailCount]);

	const actions = useMemo(
		() => pickTopActions(campaigns, newEmailCount),
		[campaigns, newEmailCount]
	);

	const itemMarginTops = useMemo(() => computeItemMarginTops(actions), [actions]);

	const handleActionClick = (action: StrategyAction) => {
		if (action.kind === 'searchContacts' || action.kind === 'replyEmails') {
			// search-focus + inbox navigation aren't wired up yet
			return;
		}
		if (action.campaign) {
			router.push(`${urls.murmur.campaign.detail(action.campaign.id)}?silent=1`);
		}
	};

	return (
		<div
			className={className}
			style={{
				width: '631px',
				borderRadius: '6px',
				background: 'rgba(254, 254, 254, 0.74)',
				padding: '14px 4px',
				display: 'flex',
				flexDirection: 'column',
				gap: '10px',
				boxSizing: 'border-box',
				overflow: 'hidden',
			}}
		>
			<div
				style={{
					fontFamily: 'Inter, sans-serif',
					fontSize: '13px',
					fontWeight: 500,
					lineHeight: '20px',
					color: '#1A1A1A',
					paddingLeft: '12px',
				}}
			>
				Strategy
			</div>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				{actions.map((action, index) => {
					const isTop = index === 0;
					const wrapperStyle: React.CSSProperties = {
						display: 'flex',
						justifyContent: 'center',
						marginTop: itemMarginTops[index] ?? 0,
						width: '100%',
					};

					if (isTop && action.kind === 'replyEmails') {
						const useReal =
							!(mockState?.campaigns && mockState.campaigns.length > 0) &&
							mockState?.newEmailCount == null;
						return (
							<div key={`replyEmails-top-${index}`} style={wrapperStyle}>
								<ReplyEmailsTopCard
									count={action.count}
									realEmails={useReal ? inboundEmails : undefined}
								/>
							</div>
						);
					}

					if (isTop && action.kind === 'draftMessages') {
						return (
							<div key={`draftMessages-top-${index}`} style={wrapperStyle}>
								<DraftMessagesTopCard
									count={action.count}
									campaignName={action.campaign?.name}
								/>
							</div>
						);
					}

					if (isTop && action.kind === 'reviewDrafts') {
						return (
							<div key={`reviewDrafts-top-${index}`} style={wrapperStyle}>
								<ReviewDraftsTopCard
									count={action.count}
									campaignId={action.campaign?.id}
									campaignName={action.campaign?.name}
								/>
							</div>
						);
					}

					if (isTop && action.kind === 'searchContacts') {
						return (
							<div key={`searchContacts-top-${index}`} style={wrapperStyle}>
								<SearchContactsTopCard />
							</div>
						);
					}

					return (
						<div
							key={`${action.kind}-${action.campaign?.id ?? 'none'}-${index}`}
							style={wrapperStyle}
						>
							<button
								type="button"
								onClick={() => handleActionClick(action)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '8px',
									width: isTop ? '100%' : '620px',
									maxWidth: '100%',
									height: isTop ? undefined : '30px',
									minHeight: isTop ? '52px' : undefined,
									padding: isTop ? '12px 14px' : '0 14px',
									borderRadius: '6px',
									background: actionBackground(action, isTop),
									border: 'none',
									color: '#1A1A1A',
									fontFamily: 'Inter, sans-serif',
									fontSize: '14px',
									fontWeight: isTop ? 600 : 500,
									textAlign: 'left',
									cursor: 'pointer',
								}}
							>
								<span>{actionLabel(action)}</span>
								{action.campaign && (
									<span
										style={{
											display: 'inline-flex',
											alignItems: 'center',
											background: '#FFFFFF',
											borderRadius: '6px',
											padding: '2px 6px',
										}}
									>
										<CampaignTitlePills title={action.campaign.name} size="table" />
									</span>
								)}
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default DashboardStrategyBox;
