'use client';

import { FC, ReactNode, useMemo, useState } from 'react';
import { useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import type { InboundEmailWithRelations } from '@/types';

type CampaignWithCounts = {
	id: number;
	name: string;
	draftCount?: number;
};

type StrategyEmail = {
	sender: string;
	badge: number;
	campaignName: string;
	subject: string;
	preview: string;
};

type Props = {
	onReplyEmails?: () => void;
	onSendDrafts?: () => void;
	onSearchContacts?: () => void;
};

const handleActivateKeyDown =
	(onActivate?: () => void) => (e: React.KeyboardEvent) => {
		if (!onActivate) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onActivate();
		}
	};

const FALLBACK_EMAILS: StrategyEmail[] = [
	{
		sender: 'Alex Young',
		badge: 2,
		campaignName: 'Leo',
		subject: 'Exploring Live Jazz Performance',
		preview: 'Thank you so much for reaching out. However I regret to in',
	},
	{
		sender: 'Rebecca Adolf',
		badge: 11,
		campaignName: 'Pieces',
		subject: 'Exploring Live Jazz Performance',
		preview: 'Thank you so much for reaching out. However I regret to in',
	},
];

const FOLDER_COLORS: Record<string, string> = {
	Leo: '#C5494F',
	Pieces: '#C94AD8',
	Capricorn: '#C94AD8',
};

const STRATEGY_ITEM_WIDTH = 351;
const SECONDARY_ACTION_HEIGHT = 30;

const stripBody = (raw: string | null | undefined) =>
	(raw ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const inboundToStrategyEmail = (
	email: InboundEmailWithRelations,
	index: number
): StrategyEmail => {
	const contact = email.contact;
	const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	return {
		sender:
			fullName ||
			contact?.company?.trim() ||
			email.senderName?.trim() ||
			email.sender?.trim() ||
			'Unknown sender',
		badge: index + 1,
		campaignName: email.campaign?.name?.trim() || 'Folder',
		subject: email.subject?.trim() || '(No Subject)',
		preview:
			stripBody(email.strippedText) ||
			stripBody(email.bodyPlain) ||
			stripBody(email.bodyHtml) ||
			'Reply received from this contact.',
	};
};

const MiniFolderIcon = ({ color }: { color: string }) => (
	<svg width="16" height="10.4" viewBox="0 0 20 13" fill="none" aria-hidden="true">
		<path d="M1 3.25C1 2.56 1.56 2 2.25 2H7.65L8.9 3.5H17.75C18.44 3.5 19 4.06 19 4.75V11.25C19 11.94 18.44 12.5 17.75 12.5H2.25C1.56 12.5 1 11.94 1 11.25V3.25Z" fill={color} />
		<path d="M1 2.25C1 .84 1.84 0 2.25 0H6.15C6.52 0 6.88 .17 7.12 .46L8.4 2H1V2.25Z" fill={color} />
	</svg>
);

const FolderPill = ({ name }: { name: string }) => {
	const color = FOLDER_COLORS[name] ?? '#C5494F';
	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 4,
				width: 60.845,
				height: 19.316,
				borderRadius: 3.5,
				background: name === 'Pieces' ? '#C8C5F4' : '#B9EAF1',
				padding: '0 4px',
				boxSizing: 'border-box',
				fontFamily: 'Inter, sans-serif',
				fontSize: 11.5,
				fontWeight: 500,
				color: '#000',
				lineHeight: '15.426px',
				flexShrink: 0,
				overflow: 'hidden',
			}}
		>
			<MiniFolderIcon color={color} />
			<span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
				{name}
			</span>
		</span>
	);
};

const StrategyEmailRow = ({ email }: { email: StrategyEmail }) => (
	<div
		style={{
			height: 43.5,
			width: 331,
			borderRadius: 4,
			background: '#F8F8F8',
			display: 'grid',
			gridTemplateColumns: '91px 1fr',
			gridTemplateRows: '15.426px 19.316px',
			columnGap: 7,
			alignItems: 'center',
			padding: '4.5px 7px',
			boxSizing: 'border-box',
			overflow: 'hidden',
			fontFamily: 'Inter, sans-serif',
		}}
	>
		<div style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0 }}>
			<span
				style={{
					fontSize: 11.5,
					fontWeight: 700,
					lineHeight: '15.426px',
					whiteSpace: 'nowrap',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
				}}
			>
				{email.sender}
			</span>
			<span style={{ fontSize: 9.5, color: '#3A3A3A', lineHeight: '11px' }}>{email.badge}</span>
		</div>
		<div
			style={{
				fontSize: 11.5,
				fontWeight: 500,
				lineHeight: '15.426px',
				whiteSpace: 'nowrap',
				overflow: 'hidden',
				textOverflow: 'clip',
			}}
		>
			{email.subject}
		</div>
		<div style={{ display: 'flex', alignItems: 'center' }}>
			<FolderPill name={email.campaignName} />
		</div>
		<div
			style={{
				fontSize: 10.5,
				fontWeight: 400,
				lineHeight: '14px',
				color: '#777',
				whiteSpace: 'nowrap',
				overflow: 'hidden',
				textOverflow: 'clip',
			}}
		>
			{email.preview}
		</div>
	</div>
);

const ActionBar = ({
	children,
	background,
	marginTop,
	onClick,
	ariaLabel,
}: {
	children: ReactNode;
	background: string;
	marginTop: number;
	onClick?: () => void;
	ariaLabel?: string;
}) => {
	const [hovered, setHovered] = useState(false);
	const interactive = Boolean(onClick);
	return (
		<div
			onClick={onClick}
			onKeyDown={interactive ? handleActivateKeyDown(onClick) : undefined}
			onMouseEnter={interactive ? () => setHovered(true) : undefined}
			onMouseLeave={interactive ? () => setHovered(false) : undefined}
			role={interactive ? 'button' : undefined}
			tabIndex={interactive ? 0 : undefined}
			aria-label={ariaLabel}
			style={{
				width: STRATEGY_ITEM_WIDTH,
				height: SECONDARY_ACTION_HEIGHT,
				margin: `${marginTop}px auto 0`,
				borderRadius: 6,
				background,
				display: 'flex',
				alignItems: 'center',
				paddingLeft: 17,
				boxSizing: 'border-box',
				fontFamily: 'Inter, sans-serif',
				fontSize: 12.555,
				fontWeight: 500,
				lineHeight: '15.426px',
				color: '#000',
				overflow: 'hidden',
				cursor: interactive ? 'pointer' : undefined,
				filter: interactive && hovered ? 'brightness(0.97)' : undefined,
				transition: 'filter 120ms ease',
			}}
		>
			{children}
		</div>
	);
};

export const CampaignOverviewStrategyBox: FC<Props> = ({
	onReplyEmails,
	onSendDrafts,
	onSearchContacts,
}) => {
	const { data: campaignsData } = useGetCampaigns();
	const { data: inboundEmails } = useGetInboundEmails({ enabled: true });
	const [replyHovered, setReplyHovered] = useState(false);

	const emails = useMemo(() => {
		const real = (inboundEmails ?? [])
			.slice(0, 2)
			.map((email, index) => inboundToStrategyEmail(email, index));
		return real.length > 0 ? real : FALLBACK_EMAILS;
	}, [inboundEmails]);

	const draftCampaign = useMemo(() => {
		const campaigns = ((campaignsData ?? []) as CampaignWithCounts[]).slice();
		campaigns.sort((a, b) => (b.draftCount ?? 0) - (a.draftCount ?? 0));
		return campaigns[0] ?? ({ name: 'Capricorn', draftCount: 49 } as CampaignWithCounts);
	}, [campaignsData]);

	const realReplyCount = inboundEmails?.length ?? 0;
	const replyCount = realReplyCount > 0 ? realReplyCount : emails.length;
	const draftCount = draftCampaign.draftCount ?? 0;

	return (
		<div
			style={{
				width: 369,
				height: 486,
				borderRadius: 6,
				background: 'rgba(254, 254, 254, 0.74)',
				overflow: 'hidden',
				fontFamily: 'Inter, sans-serif',
				color: '#000',
			}}
		>
			<div
				style={{
					fontSize: 12.555,
					fontWeight: 500,
					lineHeight: '15.426px',
					color: '#000',
					paddingLeft: 7,
					paddingTop: 3,
				}}
			>
				Strategy
			</div>

			<div
				onClick={onReplyEmails}
				onKeyDown={onReplyEmails ? handleActivateKeyDown(onReplyEmails) : undefined}
				onMouseEnter={onReplyEmails ? () => setReplyHovered(true) : undefined}
				onMouseLeave={onReplyEmails ? () => setReplyHovered(false) : undefined}
				role={onReplyEmails ? 'button' : undefined}
				tabIndex={onReplyEmails ? 0 : undefined}
				aria-label={`Reply to ${replyCount} new email${replyCount === 1 ? '' : 's'}`}
				style={{
					width: STRATEGY_ITEM_WIDTH,
					height: 156,
					margin: '13px auto 0',
					borderRadius: 6,
					background:
						'linear-gradient(180deg, #A9EDD2 0%, rgba(169, 237, 210, 0.20) 100%)',
					position: 'relative',
					overflow: 'hidden',
					cursor: onReplyEmails ? 'pointer' : undefined,
					filter: onReplyEmails && replyHovered ? 'brightness(0.97)' : undefined,
					transition: 'filter 120ms ease',
				}}
			>
				<div
					style={{
						position: 'absolute',
						top: 14,
						left: 36,
						fontSize: 12.555,
						fontStyle: 'normal',
						fontWeight: 500,
						lineHeight: '15.426px',
						color: '#000',
						textAlign: 'center',
						whiteSpace: 'nowrap',
					}}
				>
					Reply to {replyCount} New Email{replyCount === 1 ? '' : 's'}
				</div>
				<div
					style={{
						position: 'absolute',
						left: 10,
						top: 43,
						display: 'flex',
						flexDirection: 'column',
						gap: 5,
					}}
				>
					{emails.slice(0, 2).map((email) => (
						<StrategyEmailRow key={`${email.sender}-${email.campaignName}`} email={email} />
					))}
				</div>
			</div>

			<ActionBar
				background="#A9EFB4"
				marginTop={18}
				onClick={onSendDrafts}
				ariaLabel={`Send ${draftCount} drafts in ${draftCampaign.name}`}
			>
				<span>Send {draftCount} Drafts in</span>
				<span style={{ marginLeft: 15 }}>
					<FolderPill name={draftCampaign.name} />
				</span>
			</ActionBar>

			<ActionBar
				background="#C9EFA9"
				marginTop={18}
				onClick={onSearchContacts}
				ariaLabel="Search for new contacts"
			>
				Search for new contacts
			</ActionBar>
		</div>
	);
};
