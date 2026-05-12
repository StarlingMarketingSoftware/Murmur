import { FC } from 'react';
import type { InboundEmailWithRelations } from '@/types';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { US_STATES } from '@/constants/usStates';
import { getContactCategoryPill } from './DashboardStrategyBox';

// Fallback used when no real inbound email is available (mock-state mode), so
// designers can see the preview chrome with content in place during iteration.
const PREVIEW_MOCK = {
	sender: 'Alex Young',
	company: 'Consequence Media',
	state: 'New York',
	headline: 'Music Venue',
	subject: 'Exploring Live Jazz Performance at Consequence Media',
	body: `Hi,
I hope this email finds you well! I am writing to introduce our dynamic jazz trio. We have been playing together for many years, blending classic and contemporary jazz to create a resonant, engaging live experience for diverse audiences. Our performances truly bring people together, much like how Kirks' Grocery unites the community in a meaningful way.
I've been following your venue and am truly impressed by your dedication to fostering a vibrant, welcoming atmosphere. I believe our performances could greatly enhance this energy by adding a lively musical component to your events.
I'd really appreciate the chance to discuss this possibility. Are you available next week—I'm more than happy to accommodate to your schedule.

Thank you,
Benjamin Price`,
};

const cleanBody = (raw: string | null | undefined): string => {
	if (!raw) return '';
	return raw
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n\n')
		.replace(/<\/div>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
};

type Props = {
	email?: InboundEmailWithRelations;
};

export const NewEmailHoverPreview: FC<Props> = ({ email }) => {
	const contact = email?.contact as
		| {
				firstName?: string | null;
				lastName?: string | null;
				company?: string | null;
				state?: string | null;
				headline?: string | null;
				title?: string | null;
		  }
		| null
		| undefined;

	const sender = email
		? `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim() ||
		  contact?.company?.trim() ||
		  email.senderName?.trim() ||
		  email.sender?.trim() ||
		  'Unknown sender'
		: PREVIEW_MOCK.sender;

	const company = email ? contact?.company?.trim() || '' : PREVIEW_MOCK.company;
	const subject = email
		? email.subject?.trim() || '(No Subject)'
		: PREVIEW_MOCK.subject;

	const stateRaw = email ? contact?.state || '' : PREVIEW_MOCK.state;
	const stateAbbr = stateRaw
		? getStateAbbreviation(stateRaw)?.trim().toUpperCase() || ''
		: '';
	const stateFullName = stateAbbr
		? US_STATES.find((s) => s.abbr === stateAbbr)?.name || ''
		: '';

	const categoryContact = email
		? contact
		: ({ headline: PREVIEW_MOCK.headline } as { headline?: string });
	const categoryPill = getContactCategoryPill(
		categoryContact as Parameters<typeof getContactCategoryPill>[0]
	);

	const bodyText = email
		? cleanBody(email.strippedText) ||
		  cleanBody(email.bodyPlain) ||
		  cleanBody(email.bodyHtml)
		: PREVIEW_MOCK.body;

	return (
		<div
			style={{
				width: '654px',
				height: '374px',
				borderRadius: '7.048px',
				background: '#7AABC5',
				position: 'relative',
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
					height: '26px',
					background: '#C0EEF7',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '0 12px',
					boxSizing: 'border-box',
					gap: '12px',
					borderTopLeftRadius: '7.048px',
					borderTopRightRadius: '7.048px',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'baseline',
						gap: '10px',
						minWidth: 0,
					}}
				>
					<span
						style={{
							fontSize: '14px',
							fontWeight: 700,
							whiteSpace: 'nowrap',
						}}
					>
						{sender}
					</span>
					{company && (
						<span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
							{company}
						</span>
					)}
				</div>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '6px',
						flexShrink: 0,
					}}
				>
					{categoryPill && (
						<span
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: '4px',
								height: '18px',
								padding: '0 8px',
								borderRadius: '9px',
								border: '1px solid #000',
								background: categoryPill.background,
								fontSize: '11px',
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
									minWidth: '29px',
									height: '18px',
									borderRadius: '6px',
									border: '1px solid #000',
									color: '#000',
									fontFamily: 'Inter, sans-serif',
									fontSize: '12px',
									fontWeight: 400,
									lineHeight: '14px',
									padding: '0 4px',
									backgroundColor:
										stateBadgeColorMap[stateAbbr] || 'transparent',
								}}
							>
								{stateAbbr}
							</span>
							{stateFullName && (
								<span style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
									{stateFullName}
								</span>
							)}
						</>
					)}
				</div>
			</div>

			<div
				style={{
					position: 'absolute',
					top: '34px',
					left: '50%',
					transform: 'translateX(-50%)',
					width: '639px',
					height: '24px',
					borderRadius: '7.048px',
					background: '#FFF',
					display: 'flex',
					alignItems: 'center',
					padding: '0 12px',
					boxSizing: 'border-box',
				}}
			>
				<span
					style={{
						fontSize: '14px',
						fontWeight: 700,
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
				>
					{subject}
				</span>
			</div>

			<div
				style={{
					position: 'absolute',
					top: '66px',
					left: '50%',
					transform: 'translateX(-50%)',
					width: '640px',
					height: '297px',
					borderRadius: '7.048px',
					background: '#FFF',
					padding: '14px 18px',
					boxSizing: 'border-box',
					overflow: 'hidden',
					fontSize: '13px',
					lineHeight: '18px',
					color: '#1A1A1A',
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
				}}
			>
				{bodyText}
			</div>
		</div>
	);
};

export default NewEmailHoverPreview;
