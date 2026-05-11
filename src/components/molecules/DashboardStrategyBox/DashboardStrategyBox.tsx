import { FC, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import type { InboundEmailWithRelations } from '@/types';
import { CampaignTitlePills } from '@/components/molecules/CampaignTitlePills/CampaignTitlePills';
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
				height: '311px',
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
					gap: '10px',
					flex: 1,
					minHeight: 0,
				}}
			>
				{actions.map((action, index) => {
					const isTop = index === 0;

					if (isTop && action.kind === 'replyEmails') {
						const useReal =
							!(mockState?.campaigns && mockState.campaigns.length > 0) &&
							mockState?.newEmailCount == null;
						return (
							<ReplyEmailsTopCard
								key={`replyEmails-top-${index}`}
								count={action.count}
								realEmails={useReal ? inboundEmails : undefined}
							/>
						);
					}

					if (isTop && action.kind === 'draftMessages') {
						return (
							<DraftMessagesTopCard
								key={`draftMessages-top-${index}`}
								count={action.count}
								campaignName={action.campaign?.name}
							/>
						);
					}

					return (
						<button
							key={`${action.kind}-${action.campaign?.id ?? 'none'}-${index}`}
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
					);
				})}
			</div>
		</div>
	);
};

export default DashboardStrategyBox;
