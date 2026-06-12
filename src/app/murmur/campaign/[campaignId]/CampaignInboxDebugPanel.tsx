'use client';

import { FC, useEffect, useMemo, useState } from 'react';
import type { EmailWithRelations, InboundEmailWithRelations } from '@/types/campaign';
import type { ContactWithName } from '@/types/contact';
import type { CampaignWithRelations } from '@/types/campaign';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CampaignInboxOutcome = 'response' | 'booked' | 'in-progress' | 'declined';

export type CampaignInboxExchange = {
	from: 'contact' | 'us';
	body: string;
};

export type CampaignInboxConversation = {
	enabled?: boolean; // default true
	contactFirstName: string;
	contactLastName: string;
	contactEmail: string;
	contactCompany?: string;
	contactHeadline?: string;
	contactTitle?: string;
	contactState?: string;
	contactCity?: string;
	outcome: CampaignInboxOutcome;
	initialSubject: string;
	/**
	 * Exchanges in chronological order (oldest first). First entry should
	 * generally be from `us` (the initial pitch). 7-11 entries recommended.
	 */
	exchanges: CampaignInboxExchange[];
};

export type CampaignInboxMockState = {
	conversations?: CampaignInboxConversation[];
};

export type CampaignInboxMockData = {
	inboundEmails: InboundEmailWithRelations[];
	sentEmails: EmailWithRelations[];
	/** Sent emails re-shaped into the inbound-relation shape (for InboxSection's sampleData prop). */
	sentEmailsAsInbound: Array<InboundEmailWithRelations & { isSent?: boolean }>;
	contacts: ContactWithName[];
	contactByEmail: Record<string, ContactWithName>;
	allowedSenderEmails: string[];
};

// ---------------------------------------------------------------------------
// Preset conversations (7-11 exchanges)
// ---------------------------------------------------------------------------

const C1: CampaignInboxConversation = {
	contactFirstName: 'Maria',
	contactLastName: 'Lin',
	contactEmail: 'maria@stargazerhall.com',
	contactCompany: 'Stargazer Hall',
	contactHeadline: 'Music Venue',
	contactTitle: 'Talent Buyer',
	contactState: 'NY',
	contactCity: 'Brooklyn',
	outcome: 'booked',
	initialSubject: 'Indie duo — Stargazer Hall summer dates',
	exchanges: [
		{
			from: 'us',
			body:
				"Hi Maria — we're a Brooklyn-based indie duo that pulls 100-150 at small rooms in the northeast. Loved your Tuesday acoustic series and would love to be considered for a summer slot. Happy to send tracks and last year's draws if helpful.",
		},
		{
			from: 'contact',
			body:
				'Hey — thanks for reaching out. We do have some Tuesdays open in June and July. Can you send a link or two and a quick pitch on what you bring to a midweek show?',
		},
		{
			from: 'us',
			body:
				"Absolutely. Here's our most recent single and a live clip from Union Pool last month: [links]. We promote heavily to our NYC list (~3.4k) and usually bring 60-80 on a Tuesday on our own.",
		},
		{
			from: 'contact',
			body:
				"Tracks sound great. The Union Pool clip is what I needed — you guys play tight. I'm penciling you in for either June 17 or July 8. Any preference?",
		},
		{
			from: 'us',
			body:
				"July 8 works much better — we'll be coming off a short run that weekend, so the band will be warm. Any chance of a co-headline that night, or are we looking at a 3-band bill?",
		},
		{
			from: 'contact',
			body:
				"3-band bill is the move for Tuesdays. We'd put you in the 9pm slot. Pay is $250 + door split after the first 60 paid. Sound good?",
		},
		{
			from: 'us',
			body:
				"Sounds great. Confirming July 8, 9pm slot, $250 + door split after 60. Want us to suggest opener options, or do you have someone in mind?",
		},
		{
			from: 'contact',
			body:
				"I'll handle the opener — we have a singer-songwriter we've been wanting to bring through. I'll send the contract over tomorrow. Welcome to Stargazer 👋",
		},
		{
			from: 'us',
			body:
				"Awesome — looking forward to it. We'll start pushing the date on our channels once the contract is signed.",
		},
		{
			from: 'contact',
			body:
				"Booked and confirmed for July 8. Contract is in your inbox. Doors at 8, your set at 9. See you in July.",
		},
	],
};

const C2: CampaignInboxConversation = {
	contactFirstName: 'Jordan',
	contactLastName: 'Pierce',
	contactEmail: 'jordan@bluenotecafe.com',
	contactCompany: 'Blue Note Cafe',
	contactHeadline: 'Coffee Shop',
	contactTitle: 'Owner',
	contactState: 'OR',
	contactCity: 'Portland',
	outcome: 'in-progress',
	initialSubject: 'Friday acoustic residency idea — Blue Note Cafe',
	exchanges: [
		{
			from: 'us',
			body:
				"Hi Jordan — we're an acoustic duo passing through Portland in late August. Love what Blue Note is doing with the Friday evening sets. Any chance you'd be open to discussing a one-off or short residency?",
		},
		{
			from: 'contact',
			body:
				"Hey! We've been wanting to revive Friday evenings honestly. What's the format — covers, originals, mix? And what kind of rate are you looking at?",
		},
		{
			from: 'us',
			body:
				"It's about 60/40 originals/covers. Two 45-minute sets is our usual coffee-shop setup. Rate is flexible — typically $200 + tips, or we can do tips-only with a guaranteed minimum if you're testing the night.",
		},
		{
			from: 'contact',
			body:
				"Holding the dates of Aug 22 and Aug 29 for you tentatively. Let me check with our booker on the rate — I'll follow up by Thursday.",
		},
		{
			from: 'us',
			body:
				"Appreciate it. If it helps, here's a Friday-night recording from a similar room in Seattle last month: [link]. Happy to send EPK too.",
		},
		{
			from: 'contact',
			body:
				"Just listened — yeah this is exactly the vibe we want. Talked to my partner; we're interested in doing both nights. Working out the rate, will get back to you this week.",
		},
		{
			from: 'us',
			body:
				"Sounds great — standing by. Whenever you want to lock it in, I can hold those dates for another 2 weeks max before we have to release them.",
		},
	],
};

const C3: CampaignInboxConversation = {
	contactFirstName: 'Casey',
	contactLastName: 'Park',
	contactEmail: 'casey@theironroom.com',
	contactCompany: 'The Iron Room',
	contactHeadline: 'Restaurant',
	contactTitle: 'Events Manager',
	contactState: 'TX',
	contactCity: 'Austin',
	outcome: 'declined',
	initialSubject: 'Live music for The Iron Room — Aug 20th',
	exchanges: [
		{
			from: 'us',
			body:
				"Hi Casey — we're a Texas-based trio routing through Austin in late August. We love rooms like Iron Room and would be excited to do a low-key dinner-hour set if you book live music.",
		},
		{
			from: 'contact',
			body:
				"Hey — we do book live music on weekends, mainly Friday and Saturday evenings. Saw your name on a flyer at Mohawk a while back. What are you looking at date-wise?",
		},
		{
			from: 'us',
			body:
				"Targeting Saturday Aug 20th if it's open. Dinner-hour set works for us, two 50-minute sets between 7-10pm.",
		},
		{
			from: 'contact',
			body:
				"Aug 20 might be tough — we have a private rehearsal dinner that night taking up the patio. Let me check if the inside bar slot is free.",
		},
		{
			from: 'us',
			body:
				"Inside bar would still be great. Lower volume is fine if that's the constraint with the private event upstairs.",
		},
		{
			from: 'contact',
			body:
				"Just got an update — the rehearsal dinner is using the full space, not just the patio. Aug 20 isn't going to work. What about Friday the 19th?",
		},
		{
			from: 'us',
			body:
				"Friday the 19th we have a long-standing date in San Antonio, unfortunately. Any other August or early September Saturdays open?",
		},
		{
			from: 'contact',
			body:
				"Checking — Aug 27 is open but we already have a country act booked. Sept 3 is taken too. Sept 10 might work but I have to check with the GM.",
		},
		{
			from: 'us',
			body:
				"We'd be off-tour by Sept 10 unfortunately. Is there any flexibility on a weekday in that Aug 17-21 window?",
		},
		{
			from: 'contact',
			body:
				"Honestly I just got told we're fully booked through Labor Day. We'll pass for now — try us again in the fall, we'd love to have you when the calendar opens back up.",
		},
		{
			from: 'us',
			body:
				"Totally understand. We'll be back in Austin in October — I'll reach out then. Thanks for the back-and-forth.",
		},
	],
};

// Neutral "response" conversation — the contact replied but the thread hasn't
// progressed to a booking, decline, or in-progress signal. These route to the
// Responses sub-tab (not Opportunities). Bodies are intentionally written to
// avoid the opportunity-keyword regex (booked / confirmed / interested /
// in progress / hold the date / checking / details / etc.).
const C4: CampaignInboxConversation = {
	contactFirstName: 'Devon',
	contactLastName: 'Hart',
	contactEmail: 'devonhart@gmail.com',
	contactCompany: '',
	contactHeadline: '',
	contactTitle: '',
	contactState: 'TN',
	contactCity: 'Nashville',
	outcome: 'response',
	initialSubject: 'New EP — hello from Brooklyn',
	exchanges: [
		{
			from: 'us',
			body:
				"Hi Devon — quick note that our new EP just landed on streaming. Sharing in case it's your kind of thing. Thanks for the support.",
		},
		{
			from: 'contact',
			body:
				"Hey — picked up your record last week at Easy Tiger and it's been on repeat. Lovely work. Especially 'Half Moon' — the vocal layering on the second verse really lands. — Devon",
		},
		{
			from: 'us',
			body:
				"Devon, thank you so much. That track was the last one we tracked and we almost cut it. Glad it stuck.",
		},
		{
			from: 'contact',
			body:
				"Glad you didn't. Are you guys self-recording these days or working with someone?",
		},
		{
			from: 'us',
			body:
				"Mostly self-tracking at home, then a friend mixes everything at his place in Greenpoint. Cheap and slow but we like the sound.",
		},
		{
			from: 'contact',
			body:
				"Sounds like the right approach. I'll keep an eye out for the next one. Cheers.",
		},
	],
};

const C5: CampaignInboxConversation = {
	contactFirstName: 'Sam',
	contactLastName: 'Whitaker',
	contactEmail: 'sam@oakridgeradio.fm',
	contactCompany: 'Oak Ridge Radio',
	contactHeadline: 'Radio Station',
	contactTitle: 'Music Director',
	contactState: 'WA',
	contactCity: 'Seattle',
	outcome: 'response',
	initialSubject: 'Submission for Oak Ridge rotation',
	exchanges: [
		{
			from: 'us',
			body:
				"Hi Sam — submitting our new single 'Half Moon' for consideration at Oak Ridge. Streaming link and a 320 are in the EPK below.",
		},
		{
			from: 'contact',
			body:
				"Hey — got it, thanks for the clean send. Quick question, are you guys signed or self-released?",
		},
		{
			from: 'us',
			body:
				"Fully self-released. Distribution is through DistroKid, masters live with us.",
		},
		{
			from: 'contact',
			body:
				"Good to know. Our rotation skews self-released indie so that fits. Who's mixing?",
		},
		{
			from: 'us',
			body:
				"Our friend Tomas — he mixes most of our stuff out of his place in Greenpoint, Brooklyn.",
		},
		{
			from: 'contact',
			body:
				"Nice — Tomas does great work, we've spun a couple of his other projects. Thanks for sending this over, will queue it up for the team meeting next week.",
		},
		{
			from: 'us',
			body:
				"Appreciate it Sam — happy to send stems or alternate masters if Oak Ridge needs a radio edit.",
		},
	],
};

export const DEFAULT_CAMPAIGN_INBOX_CONVERSATIONS: CampaignInboxConversation[] = [
	C1,
	C2,
	C3,
	C4,
	C5,
];

// ---------------------------------------------------------------------------
// Mock builder
// ---------------------------------------------------------------------------

const MOCK_USER_EMAIL = 'me@murmur.test';
const MILLIS_PER_EXCHANGE = 8 * 60 * 60 * 1000; // 8 hours between exchanges

const stripHtml = (text: string) => text.replace(/<[^>]*>/g, '').trim();

const buildContact = (
	conv: CampaignInboxConversation,
	contactId: number
): ContactWithName => {
	const headline = conv.contactHeadline?.trim() || '';
	const title = conv.contactTitle?.trim() || headline;
	const firstName = conv.contactFirstName.trim();
	const lastName = conv.contactLastName.trim();
	const fullName = `${firstName} ${lastName}`.trim();

	// Cast to ContactWithName — we deliberately fill the common fields that the
	// inbox UI actually reads and let unused Prisma fields stay null/undefined.
	return {
		id: contactId,
		email: conv.contactEmail.trim().toLowerCase(),
		firstName,
		lastName,
		name: fullName || null,
		company: conv.contactCompany?.trim() || '',
		headline,
		title,
		state: conv.contactState?.trim() || '',
		city: conv.contactCity?.trim() || '',
		country: 'US',
		phone: null,
		website: null,
		address: null,
		linkedInUrl: null,
		photoUrl: null,
		metadata: null,
		userId: null,
		contactListId: null,
		apolloPersonId: null,
		emailValidatedAt: null,
		emailValidationStatus: 'unknown',
		emailValidationSubStatus: null,
		isPrivate: false,
		hasVectorEmbedding: false,
		userContactListCount: 0,
		manualDeselections: 0,
		companyFoundedYear: null,
		companyIndustry: null,
		companyKeywords: [],
		companyLinkedInUrl: null,
		companyPostalCode: null,
		companyTechStack: [],
		companyType: null,
		lastResearchedDate: null,
		latitude: null,
		longitude: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	} as unknown as ContactWithName;
};

export const buildCampaignInboxMockData = (
	state: CampaignInboxMockState | undefined,
	campaign: CampaignWithRelations | undefined
): CampaignInboxMockData => {
	const result: CampaignInboxMockData = {
		inboundEmails: [],
		sentEmails: [],
		sentEmailsAsInbound: [],
		contacts: [],
		contactByEmail: {},
		allowedSenderEmails: [],
	};

	const conversations = (state?.conversations ?? DEFAULT_CAMPAIGN_INBOX_CONVERSATIONS).filter(
		(c) => c.enabled !== false
	);

	const now = Date.now();
	const campaignSnapshot: { id: number; name: string } = {
		id: campaign?.id ?? -1,
		name: campaign?.name ?? 'Debug Campaign',
	};

	conversations.forEach((conv, convIndex) => {
		const contactId = -(convIndex + 1) * 1000;
		const contact = buildContact(conv, contactId);
		result.contacts.push(contact);
		result.contactByEmail[contact.email.toLowerCase()] = contact;
		result.allowedSenderEmails.push(contact.email);

		const total = conv.exchanges.length;
		// Most recent exchange has the smallest "ago" delta.
		conv.exchanges.forEach((exchange, exchangeIndex) => {
			const ageIndex = total - 1 - exchangeIndex;
			const sentAt = new Date(
				now -
					ageIndex * MILLIS_PER_EXCHANGE -
					convIndex * 30 * 60 * 1000 /* stagger conversations */
			);
			const isFirst = exchangeIndex === 0;
			const subject = isFirst
				? conv.initialSubject
				: conv.initialSubject.startsWith('Re: ')
					? conv.initialSubject
					: `Re: ${conv.initialSubject}`;

			const idBase = (convIndex + 1) * 100 + exchangeIndex + 1;

			if (exchange.from === 'us') {
				// Outbound sent email
				const sentEmail = {
					id: -idBase,
					subject,
					message: exchange.body,
					status: 'sent',
					reviewStatus: null,
					sentAt,
					createdAt: sentAt,
					updatedAt: sentAt,
					userId: 'mock-user',
					campaignId: campaignSnapshot.id,
					contactId: contact.id,
					contact,
					campaign,
				} as unknown as EmailWithRelations;
				result.sentEmails.push(sentEmail);

				// Sent reshaped as inbound-shape (for InboxSection sampleData.sentEmails)
				result.sentEmailsAsInbound.push({
					id: -idBase,
					sender: contact.email,
					senderName: contact.name || '',
					recipient: MOCK_USER_EMAIL,
					subject,
					bodyPlain: exchange.body,
					bodyHtml: exchange.body,
					strippedText: exchange.body,
					receivedAt: sentAt,
					contactId: contact.id,
					contact,
					campaignId: campaignSnapshot.id,
					campaign,
					originalEmail: null,
					originalEmailId: null,
					isSent: true,
				} as unknown as InboundEmailWithRelations & { isSent?: boolean });
			} else {
				// Inbound reply from contact
				const inbound = {
					id: -idBase,
					sender: contact.email,
					senderName: contact.name || '',
					recipient: MOCK_USER_EMAIL,
					subject,
					bodyPlain: exchange.body,
					bodyHtml: exchange.body,
					strippedText: stripHtml(exchange.body),
					receivedAt: sentAt,
					contactId: contact.id,
					contact,
					campaignId: campaignSnapshot.id,
					campaign,
					originalEmail: null,
					originalEmailId: null,
				} as unknown as InboundEmailWithRelations;
				result.inboundEmails.push(inbound);
			}
		});
	});

	// Newest-first for inbound list (matches API behavior).
	result.inboundEmails.sort(
		(a, b) =>
			new Date(b.receivedAt ?? 0).getTime() - new Date(a.receivedAt ?? 0).getTime()
	);
	result.sentEmails.sort(
		(a, b) => new Date(b.sentAt ?? 0).getTime() - new Date(a.sentAt ?? 0).getTime()
	);
	result.sentEmailsAsInbound.sort(
		(a, b) =>
			new Date(b.receivedAt ?? 0).getTime() - new Date(a.receivedAt ?? 0).getTime()
	);

	return result;
};

// ---------------------------------------------------------------------------
// Debug panel UI
// ---------------------------------------------------------------------------

type Props = {
	value: CampaignInboxMockState | undefined;
	onChange: (next: CampaignInboxMockState | undefined) => void;
};

const buttonStyle: React.CSSProperties = {
	padding: '4px 10px',
	border: '1px solid #999',
	borderRadius: '4px',
	background: '#fff',
	fontSize: '12px',
	cursor: 'pointer',
};

const smallButtonStyle: React.CSSProperties = {
	...buttonStyle,
	padding: '2px 8px',
	fontSize: '11px',
};

const textInputStyle: React.CSSProperties = {
	flex: 1,
	minWidth: 0,
	padding: '3px 6px',
	border: '1px solid #ccc',
	borderRadius: '4px',
	fontSize: '12px',
};

const selectStyle: React.CSSProperties = {
	flex: 1,
	padding: '3px 5px',
	border: '1px solid #ccc',
	borderRadius: '4px',
	fontSize: '12px',
	background: '#fff',
};

const textareaStyle: React.CSSProperties = {
	flex: 1,
	minWidth: 0,
	padding: '4px 6px',
	border: '1px solid #ccc',
	borderRadius: '4px',
	fontSize: '11px',
	fontFamily: 'inherit',
	resize: 'vertical',
	minHeight: 44,
};

const rowStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: '8px',
};

const labelStyle: React.CSSProperties = {
	fontSize: '11px',
	fontWeight: 500,
	color: '#333',
	minWidth: 78,
};

const rowSummaryStyle: React.CSSProperties = {
	display: 'block',
	overflow: 'hidden',
	textOverflow: 'ellipsis',
	whiteSpace: 'nowrap',
	fontSize: '11px',
	fontWeight: 500,
	color: '#666',
};

const OUTCOME_OPTIONS: Array<{ value: CampaignInboxOutcome; label: string }> = [
	{ value: 'response', label: 'Response (no opportunity)' },
	{ value: 'booked', label: 'Booked' },
	{ value: 'in-progress', label: 'In progress' },
	{ value: 'declined', label: 'Declined' },
];

const HEADLINE_PRESETS = [
	'Music Venue',
	'Coffee Shop',
	'Restaurant',
	'Music Festival',
	'Wedding Venue',
	'Wedding Planner',
	'Brewery',
	'Winery',
	'Distillery',
];

const TextField: FC<{
	label: string;
	value: string;
	placeholder?: string;
	onChange: (next: string) => void;
}> = ({ label, value, placeholder, onChange }) => (
	<div style={rowStyle}>
		<span style={labelStyle}>{label}</span>
		<input
			type="text"
			value={value}
			placeholder={placeholder}
			onChange={(e) => onChange(e.target.value)}
			style={textInputStyle}
		/>
	</div>
);

const ConversationCard: FC<{
	index: number;
	conversation: CampaignInboxConversation;
	isCollapsed: boolean;
	onToggleCollapsed: () => void;
	onChange: (next: CampaignInboxConversation) => void;
	onRemove: () => void;
	canRemove: boolean;
}> = ({
	index,
	conversation,
	isCollapsed,
	onToggleCollapsed,
	onChange,
	onRemove,
	canRemove,
}) => {
	const patch = (partial: Partial<CampaignInboxConversation>) =>
		onChange({ ...conversation, ...partial });
	const enabled = conversation.enabled !== false;
	const summary = `${conversation.contactFirstName} ${conversation.contactLastName} · ${
		conversation.contactCompany || conversation.contactEmail
	} · ${conversation.exchanges.length} exchanges${enabled ? '' : ' · (disabled)'}`;

	const updateExchange = (exIndex: number, next: Partial<CampaignInboxExchange>) => {
		const exchanges = conversation.exchanges.slice();
		exchanges[exIndex] = { ...exchanges[exIndex], ...next };
		patch({ exchanges });
	};

	const addExchange = () => {
		const last = conversation.exchanges[conversation.exchanges.length - 1];
		const nextFrom: 'us' | 'contact' = last?.from === 'us' ? 'contact' : 'us';
		patch({
			exchanges: [...conversation.exchanges, { from: nextFrom, body: '' }],
		});
	};

	const removeExchange = (exIndex: number) => {
		if (conversation.exchanges.length <= 1) return;
		patch({
			exchanges: conversation.exchanges.filter((_, idx) => idx !== exIndex),
		});
	};

	return (
		<div
			style={{
				border: '1px solid #DDD',
				borderRadius: '6px',
				padding: '8px',
				background: enabled ? '#FAFAFA' : '#F2F2F2',
				display: 'flex',
				flexDirection: 'column',
				gap: 6,
				opacity: enabled ? 1 : 0.75,
			}}
		>
			<div style={{ ...rowStyle, alignItems: 'flex-start' }}>
				<button
					type="button"
					aria-expanded={!isCollapsed}
					onClick={onToggleCollapsed}
					style={{
						flex: 1,
						minWidth: 0,
						padding: 0,
						border: 0,
						background: 'transparent',
						textAlign: 'left',
						cursor: 'pointer',
					}}
				>
					<span style={{ ...labelStyle, display: 'block', fontWeight: 700 }}>
						Conversation {index + 1}
					</span>
					<span style={rowSummaryStyle}>{summary}</span>
				</button>
				<div style={{ display: 'flex', gap: 4 }}>
					<button
						type="button"
						style={smallButtonStyle}
						onClick={() => patch({ enabled: !enabled })}
					>
						{enabled ? 'Disable' : 'Enable'}
					</button>
					<button type="button" style={smallButtonStyle} onClick={onToggleCollapsed}>
						{isCollapsed ? 'Expand' : 'Collapse'}
					</button>
					{canRemove && (
						<button type="button" style={smallButtonStyle} onClick={onRemove}>
							Remove
						</button>
					)}
				</div>
			</div>
			{!isCollapsed && (
				<>
					<TextField
						label="First name"
						value={conversation.contactFirstName}
						onChange={(next) => patch({ contactFirstName: next })}
					/>
					<TextField
						label="Last name"
						value={conversation.contactLastName}
						onChange={(next) => patch({ contactLastName: next })}
					/>
					<TextField
						label="Email"
						value={conversation.contactEmail}
						placeholder="maria@stargazerhall.com"
						onChange={(next) => patch({ contactEmail: next })}
					/>
					<TextField
						label="Company"
						value={conversation.contactCompany ?? ''}
						onChange={(next) => patch({ contactCompany: next })}
					/>
					<div style={rowStyle}>
						<span style={labelStyle}>Category</span>
						<select
							value={conversation.contactHeadline ?? ''}
							onChange={(e) => patch({ contactHeadline: e.target.value })}
							style={selectStyle}
						>
							<option value="">(custom)</option>
							{HEADLINE_PRESETS.map((preset) => (
								<option key={preset} value={preset}>
									{preset}
								</option>
							))}
						</select>
					</div>
					<TextField
						label="Headline"
						value={conversation.contactHeadline ?? ''}
						placeholder="Music Venue / Coffee Shop / etc."
						onChange={(next) => patch({ contactHeadline: next })}
					/>
					<TextField
						label="Title"
						value={conversation.contactTitle ?? ''}
						placeholder="Talent Buyer"
						onChange={(next) => patch({ contactTitle: next })}
					/>
					<TextField
						label="State"
						value={conversation.contactState ?? ''}
						placeholder="NY"
						onChange={(next) =>
							patch({ contactState: next.toUpperCase().slice(0, 2) })
						}
					/>
					<TextField
						label="City"
						value={conversation.contactCity ?? ''}
						placeholder="Brooklyn"
						onChange={(next) => patch({ contactCity: next })}
					/>
					<div style={rowStyle}>
						<span style={labelStyle}>Outcome</span>
						<select
							value={conversation.outcome}
							onChange={(e) =>
								patch({ outcome: e.target.value as CampaignInboxOutcome })
							}
							style={selectStyle}
						>
							{OUTCOME_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
					<TextField
						label="Subject"
						value={conversation.initialSubject}
						onChange={(next) => patch({ initialSubject: next })}
					/>

					<div
						style={{
							marginTop: 4,
							padding: '6px',
							border: '1px dashed #C0C0C0',
							borderRadius: 4,
							background: '#FFF',
							display: 'flex',
							flexDirection: 'column',
							gap: 4,
						}}
					>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
							}}
						>
							<strong style={{ fontSize: 11 }}>
								Exchanges ({conversation.exchanges.length})
							</strong>
							<button type="button" style={smallButtonStyle} onClick={addExchange}>
								+ Add exchange
							</button>
						</div>
						{conversation.exchanges.map((ex, exIndex) => (
							<div
								key={`ex-${exIndex}`}
								style={{
									display: 'flex',
									alignItems: 'flex-start',
									gap: 6,
									padding: '4px 0',
									borderTop: exIndex === 0 ? 'none' : '1px solid #EEE',
								}}
							>
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: 4,
										minWidth: 78,
									}}
								>
									<span
										style={{ fontSize: 10, color: '#666', fontWeight: 600 }}
									>
										#{exIndex + 1}
									</span>
									<select
										value={ex.from}
										onChange={(e) =>
											updateExchange(exIndex, {
												from: e.target.value as 'us' | 'contact',
											})
										}
										style={{
											...selectStyle,
											fontSize: 11,
											padding: '2px 4px',
										}}
									>
										<option value="us">From us</option>
										<option value="contact">From contact</option>
									</select>
									{conversation.exchanges.length > 1 && (
										<button
											type="button"
											style={smallButtonStyle}
											onClick={() => removeExchange(exIndex)}
										>
											Remove
										</button>
									)}
								</div>
								<textarea
									value={ex.body}
									onChange={(e) =>
										updateExchange(exIndex, { body: e.target.value })
									}
									style={textareaStyle}
									rows={3}
								/>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
};

const MAX_CONVERSATIONS = 8;

const cloneDefaults = (): CampaignInboxConversation[] =>
	DEFAULT_CAMPAIGN_INBOX_CONVERSATIONS.map((c) => ({
		...c,
		exchanges: c.exchanges.map((e) => ({ ...e })),
	}));

export const CampaignInboxDebugPanel: FC<Props> = ({ value, onChange }) => {
	const [collapsed, setCollapsed] = useState(false);
	const [collapsedRowIndexes, setCollapsedRowIndexes] = useState<Set<number>>(
		// Default all conversations collapsed since they are long.
		() => new Set(DEFAULT_CAMPAIGN_INBOX_CONVERSATIONS.map((_, idx) => idx))
	);

	const [conversations, setConversations] = useState<CampaignInboxConversation[]>(
		() =>
			value?.conversations?.length
				? value.conversations.map((c) => ({ ...c, exchanges: c.exchanges.map((e) => ({ ...e })) }))
				: cloneDefaults()
	);

	const overrideActive = value != null;
	const enabledCount = useMemo(
		() => conversations.filter((c) => c.enabled !== false).length,
		[conversations]
	);

	useEffect(() => {
		onChange({ conversations });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversations]);

	const setConversationAt = (index: number, next: CampaignInboxConversation) => {
		setConversations((prev) => {
			const copy = prev.slice();
			copy[index] = next;
			return copy;
		});
	};

	const addConversation = () => {
		setConversations((prev) => {
			if (prev.length >= MAX_CONVERSATIONS) return prev;
			const idx = prev.length + 1;
			const next: CampaignInboxConversation = {
				contactFirstName: 'Mock',
				contactLastName: `Contact ${idx}`,
				contactEmail: `mock${idx}@example.com`,
				contactCompany: `Mock Co ${idx}`,
				contactHeadline: 'Music Venue',
				contactTitle: '',
				contactState: 'NY',
				contactCity: 'Brooklyn',
				outcome: 'in-progress',
				initialSubject: 'Mock conversation',
				exchanges: [
					{ from: 'us', body: 'Initial outreach (mock).' },
					{ from: 'contact', body: 'Thanks for reaching out!' },
				],
			};
			return [...prev, next];
		});
	};

	const removeConversationAt = (index: number) => {
		setConversations((prev) => {
			if (prev.length <= 1) return prev;
			return prev.filter((_, idx) => idx !== index);
		});
		setCollapsedRowIndexes((prev) => {
			const next = new Set<number>();
			prev.forEach((rowIndex) => {
				if (rowIndex < index) next.add(rowIndex);
				if (rowIndex > index) next.add(rowIndex - 1);
			});
			return next;
		});
	};

	const toggleRowCollapsed = (index: number) => {
		setCollapsedRowIndexes((prev) => {
			const next = new Set(prev);
			if (next.has(index)) next.delete(index);
			else next.add(index);
			return next;
		});
	};

	const allCollapsed =
		conversations.length > 0 && collapsedRowIndexes.size >= conversations.length;

	const reset = () => {
		setConversations(cloneDefaults());
		setCollapsedRowIndexes(
			new Set(DEFAULT_CAMPAIGN_INBOX_CONVERSATIONS.map((_, idx) => idx))
		);
		onChange(undefined);
	};

	return (
		<div
			className="campaign-inbox-debug-panel"
			onWheel={(e) => e.stopPropagation()}
			onTouchMove={(e) => e.stopPropagation()}
			style={{
				position: 'fixed',
				top: 80,
				left: 16,
				bottom: collapsed ? undefined : 16,
				width: collapsed ? 'auto' : 360,
				maxWidth: 'calc(100vw - 32px)',
				overflow: 'hidden',
				zIndex: 9999,
				background: 'rgba(255, 255, 255, 0.97)',
				border: '1px solid #333',
				borderRadius: '8px',
				padding: collapsed ? '6px 10px' : '12px',
				boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
				display: 'flex',
				flexDirection: 'column',
				fontFamily: 'Inter, sans-serif',
				fontSize: '12px',
				color: '#1A1A1A',
				pointerEvents: 'auto',
			}}
		>
			<style>{`
				.campaign-inbox-debug-panel__body::-webkit-scrollbar {
					width: 14px;
					-webkit-appearance: none;
				}
				.campaign-inbox-debug-panel__body::-webkit-scrollbar-track {
					background: #f0f0f0;
					border-left: 1px solid #ccc;
				}
				.campaign-inbox-debug-panel__body::-webkit-scrollbar-thumb {
					background: #888;
					border-radius: 7px;
					border: 3px solid #f0f0f0;
				}
				.campaign-inbox-debug-panel__body::-webkit-scrollbar-thumb:hover {
					background: #555;
				}
			`}</style>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '8px',
				}}
			>
				<strong style={{ fontSize: '13px' }}>
					Campaign Inbox Debug{overrideActive ? '' : ' (off)'}
				</strong>
				<button type="button" onClick={() => setCollapsed((c) => !c)} style={buttonStyle}>
					{collapsed ? 'Expand' : 'Collapse'}
				</button>
			</div>

			{!collapsed && (
				<div
					className="campaign-inbox-debug-panel__body"
					style={{
						flex: 1,
						minHeight: 0,
						overflowY: 'auto',
						overscrollBehavior: 'contain',
						paddingRight: 2,
						touchAction: 'pan-y',
						marginTop: 8,
					}}
				>
					<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
						<button
							type="button"
							style={buttonStyle}
							onClick={addConversation}
							disabled={conversations.length >= MAX_CONVERSATIONS}
						>
							+ Add conversation ({conversations.length}/{MAX_CONVERSATIONS})
						</button>
						<button
							type="button"
							style={buttonStyle}
							onClick={() =>
								setCollapsedRowIndexes(
									allCollapsed
										? new Set()
										: new Set(conversations.map((_, idx) => idx))
								)
							}
						>
							{allCollapsed ? 'Expand all' : 'Collapse all'}
						</button>
					</div>

					<div style={{ color: '#666', marginTop: 6 }}>
						{enabledCount} of {conversations.length} conversation
						{conversations.length === 1 ? '' : 's'} enabled. Inbound responses, sent
						emails, and opportunities are all derived from these.
					</div>

					<hr style={{ margin: '10px 0', border: 0, borderTop: '1px solid #eee' }} />

					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{conversations.map((conv, index) => (
							<ConversationCard
								key={`conversation-${index}`}
								index={index}
								conversation={conv}
								isCollapsed={collapsedRowIndexes.has(index)}
								onToggleCollapsed={() => toggleRowCollapsed(index)}
								onChange={(next) => setConversationAt(index, next)}
								onRemove={() => removeConversationAt(index)}
								canRemove={conversations.length > 1}
							/>
						))}
					</div>

					<hr style={{ margin: '12px 0', border: 0, borderTop: '1px solid #eee' }} />

					<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
						{!overrideActive ? (
							<button
								type="button"
								style={{ ...buttonStyle, background: '#E0F0FF' }}
								onClick={() => onChange({ conversations })}
							>
								Enable override
							</button>
						) : (
							<button
								type="button"
								style={buttonStyle}
								onClick={() => onChange(undefined)}
							>
								Use real data
							</button>
						)}
						<button type="button" style={buttonStyle} onClick={reset}>
							Reset
						</button>
					</div>

					<div style={{ color: '#888', marginTop: 8, lineHeight: 1.4 }}>
						Each conversation seeds 7-11 alternating sent/received emails. The Inbox
						tab&apos;s Responses, Sent, and Opportunities views (Opportunities is
						auto-classified from subject/body keywords like &quot;booked&quot;,
						&quot;passed&quot;, &quot;confirmed&quot;) all populate from these.
					</div>
				</div>
			)}
		</div>
	);
};

export default CampaignInboxDebugPanel;
