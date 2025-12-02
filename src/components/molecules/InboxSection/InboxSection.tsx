'use client';

import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import { useMe } from '@/hooks/useMe';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import type { InboundEmailWithRelations, EmailWithRelations } from '@/types';
import type { ContactWithName } from '@/types/contact';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';

/**
 * Strip quoted reply content from email body (e.g., "On Thu, Nov 27, 2025 at 2:36 AM ... wrote:")
 */
const stripQuotedReply = (text: string): string => {
	// Match patterns like "On [day], [month] [date], [year] at [time] [name] <email> wrote:"
	// or "On [date], [name] wrote:" and everything after
	const patterns = [
		/\n*On\s+[A-Za-z]{3},\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*[AP]M\s+.*?wrote:[\s\S]*/i,
		/\n*On\s+[A-Za-z]+,\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*[AP]M\s+.*?wrote:[\s\S]*/i,
		/\n*On\s+\d{1,2}\/\d{1,2}\/\d{2,4}.*?wrote:[\s\S]*/i,
		/\n*On\s+.*?\s+wrote:[\s\S]*/i,
	];

	let result = text;
	for (const pattern of patterns) {
		result = result.replace(pattern, '');
	}
	return result.trim();
};

/**
 * Strip quoted reply content from HTML email body
 */
const stripQuotedReplyHtml = (html: string): string => {
	// Remove Gmail-style quoted content (div with gmail_quote class)
	let result = html.replace(
		/<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
		''
	);

	// Remove blockquote elements (common in email replies)
	result = result.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '');

	// Remove "On ... wrote:" pattern and everything after in plain text within HTML
	const patterns = [
		/<div[^>]*>On\s+[A-Za-z]{3},\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*[AP]M[\s\S]*$/i,
		/On\s+[A-Za-z]{3},\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*[AP]M\s+.*?wrote:[\s\S]*$/i,
		/On\s+.*?\s+wrote:[\s\S]*$/i,
	];

	for (const pattern of patterns) {
		result = result.replace(pattern, '');
	}

	return result.trim();
};

interface InboxSectionProps {
	/**
	 * Optional list of sender email addresses that should be visible
	 * in this inbox instance. When provided, inbound emails whose
	 * `sender` does not match any of these addresses will be hidden.
	 *
	 * Intended for the in‑campaign inbox, where we only want to show
	 * replies from contacts that belong to the active campaign.
	 */
	allowedSenderEmails?: string[];

	/**
	 * Optional map of sender email -> campaign contact.
	 * When provided (in campaign inbox), this is treated as the
	 * source of truth for the contact's name/company.
	 */
	contactByEmail?: Record<string, ContactWithName>;

	/**
	 * Optional campaign ID to filter sent emails by campaign.
	 */
	campaignId?: number;
}

/**
 * Resolve the best contact object for a given inbound email, preferring
 * the campaign contact (from `contactByEmail`) over the raw `email.contact`.
 */
const resolveContactForEmail = (
	email: InboundEmailWithRelations,
	contactByEmail?: Record<string, ContactWithName>
) => {
	const senderKey = email.sender?.toLowerCase().trim();
	if (senderKey && contactByEmail && contactByEmail[senderKey]) {
		return contactByEmail[senderKey] as any;
	}
	return email.contact as any;
};

/**
 * Derive a stable, campaign-linked display name for an inbound email.
 * Prefer the linked campaign contact over the raw email sender/header.
 */
const getCanonicalContactName = (
	email: InboundEmailWithRelations,
	contactByEmail?: Record<string, ContactWithName>
): string => {
	const contact: any = resolveContactForEmail(email, contactByEmail);

	if (contact) {
		const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
		const legacyName: string | undefined =
			typeof contact.name === 'string' ? contact.name : undefined;

		const primary =
			fullName ||
			(legacyName && legacyName.trim()) ||
			(contact.company && contact.company.trim()) ||
			(contact.email && contact.email.trim());

		if (primary && typeof primary === 'string' && primary.trim().length > 0) {
			return primary.trim();
		}
	}

	// Fallback: raw sender info from the inbound email headers
	const senderLabel = email.senderName?.trim() || email.sender?.trim();
	return senderLabel || 'Unknown sender';
};

/**
 * Optional secondary label for the company, shown only when we have a
 * separate person name as the primary label (mirrors ContactResearchPanel).
 */
const getContactCompanyLabel = (
	email: InboundEmailWithRelations,
	contactByEmail?: Record<string, ContactWithName>
): string | null => {
	const contact: any = resolveContactForEmail(email, contactByEmail);
	if (!contact) return null;

	const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
	const legacyName: string | undefined =
		typeof contact.name === 'string' ? contact.name : undefined;

	const hasName =
		(fullName && fullName.length > 0) || (legacyName && legacyName.trim().length > 0);

	// If we are showing the company as the main title (because no name),
	// don't repeat it as a secondary label.
	if (!hasName) return null;

	const company: string | undefined =
		typeof contact.company === 'string' ? contact.company : undefined;

	if (!company || !company.trim()) return null;
	return company.trim();
};

export const InboxSection: FC<InboxSectionProps> = ({
	allowedSenderEmails,
	contactByEmail,
	campaignId,
}) => {
	const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
	const {
		data: inboundEmails,
		isLoading: isLoadingInbound,
		error: inboundError,
	} = useGetInboundEmails();
	const {
		data: emails,
		isLoading: isLoadingEmails,
		error: emailsError,
	} = useGetEmails({
		filters: campaignId ? { campaignId } : undefined,
	});
	const sentEmails = emails?.filter((email) => email.status === 'sent') || [];
	const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
	const [replyMessage, setReplyMessage] = useState('');
	const [isSending, setIsSending] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [sentReplies, setSentReplies] = useState<
		Record<number, Array<{ message: string; timestamp: Date }>>
	>({});

	const { user } = useMe();
	const { mutateAsync: sendMailgunMessage } = useSendMailgunMessage({
		successMessage: 'Reply sent successfully',
		errorMessage: 'Failed to send reply',
	});

	// If a list of allowed sender emails is provided (e.g. campaign contacts),
	// hide any inbound emails whose sender address does not match.
	const normalizedAllowedSenders =
		allowedSenderEmails && allowedSenderEmails.length > 0
			? new Set(
					allowedSenderEmails
						.filter((email) => !!email)
						.map((email) => email.toLowerCase().trim())
			  )
			: null;

	const filteredBySender =
		normalizedAllowedSenders && inboundEmails
			? inboundEmails.filter((email) => {
					const sender = email.sender?.toLowerCase().trim();
					return !!sender && normalizedAllowedSenders.has(sender);
			  })
			: inboundEmails;

	// Convert sent emails to a format compatible with inbox display
	const normalizedSentEmails: Array<InboundEmailWithRelations & { isSent?: boolean }> =
		sentEmails.map(
			(email) =>
				({
					id: email.id,
					sender: email.contact?.email || '',
					senderName: email.contact
						? `${email.contact.firstName || ''} ${email.contact.lastName || ''}`.trim()
						: '',
					subject: email.subject || '',
					bodyPlain: email.message || '',
					strippedText: email.message?.replace(/<[^>]*>/g, '') || '',
					bodyHtml: email.message || '',
					receivedAt: email.sentAt || email.createdAt,
					contact: email.contact,
					campaign: null,
					originalEmail: null,
					isSent: true,
				} as any)
		);

	// Choose which emails to display based on active tab
	const emailsToDisplay = activeTab === 'inbox' ? filteredBySender : normalizedSentEmails;
	const isLoading = activeTab === 'inbox' ? isLoadingInbound : isLoadingEmails;
	const error = activeTab === 'inbox' ? inboundError : emailsError;

	// Further filter by search query (sender, subject, body, contact name/company/email)
	const visibleEmails = emailsToDisplay?.filter((email) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		const sender = email.sender?.toLowerCase() || '';
		const senderName = email.senderName?.toLowerCase() || '';
		const subject = email.subject?.toLowerCase() || '';
		const body = (email.strippedText || email.bodyPlain || '').toLowerCase();

		const contact: any = resolveContactForEmail(email, contactByEmail);
		const fullName =
			contact && (contact.firstName || contact.lastName)
				? `${contact.firstName || ''} ${contact.lastName || ''}`.trim().toLowerCase()
				: '';
		const legacyName =
			contact && typeof contact.name === 'string' ? contact.name.toLowerCase() : '';
		const company =
			contact && typeof contact.company === 'string' ? contact.company.toLowerCase() : '';
		const contactEmail =
			contact && typeof contact.email === 'string' ? contact.email.toLowerCase() : '';

		return (
			sender.includes(query) ||
			senderName.includes(query) ||
			subject.includes(query) ||
			body.includes(query) ||
			fullName.includes(query) ||
			legacyName.includes(query) ||
			company.includes(query) ||
			contactEmail.includes(query)
		);
	});

	const selectedEmail = visibleEmails?.find((email) => email.id === selectedEmailId);

	const handleSendReply = async () => {
		if (!selectedEmail || !replyMessage.trim()) return;

		const senderEmail =
			user?.customDomain && user?.customDomain !== ''
				? user?.customDomain
				: user?.murmurEmail;

		if (!senderEmail) {
			console.error('No sender email configured');
			return;
		}

		setIsSending(true);
		try {
			const replySubject = selectedEmail.subject?.startsWith('Re:')
				? selectedEmail.subject
				: `Re: ${selectedEmail.subject || '(No Subject)'}`;

			await sendMailgunMessage({
				recipientEmail: selectedEmail.sender,
				subject: replySubject,
				message: replyMessage,
				senderEmail: senderEmail,
				senderName:
					user?.firstName && user?.lastName
						? `${user.firstName} ${user.lastName}`
						: user?.firstName || 'Murmur User',
				originEmail: senderEmail,
			});

			// Store the sent reply
			setSentReplies((prev) => {
				const emailId = selectedEmail.id;
				const existingReplies = prev[emailId] || [];
				return {
					...prev,
					[emailId]: [
						...existingReplies,
						{ message: replyMessage, timestamp: new Date() },
					],
				};
			});

			setReplyMessage('');
		} catch (error) {
			console.error('Failed to send reply:', error);
		} finally {
			setIsSending(false);
		}
	};

	if (isLoading) {
		return (
			<div className="w-full max-w-[907px] mx-auto px-4">
				<div
					className="flex items-center justify-center"
					style={{
						width: '907px',
						height: '657px',
						border: '3px solid #000000',
						borderRadius: '8px',
					}}
				>
					<div className="text-gray-500">Loading emails...</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-full max-w-[907px] mx-auto px-4">
				<div
					className="flex items-center justify-center"
					style={{
						width: '907px',
						height: '657px',
						border: '3px solid #000000',
						borderRadius: '8px',
					}}
				>
					<div className="text-red-500">Failed to load emails</div>
				</div>
			</div>
		);
	}

	// Reset selected email when switching tabs
	const handleTabChange = (tab: 'inbox' | 'sent') => {
		setActiveTab(tab);
		setSelectedEmailId(null);
		setReplyMessage('');
	};

	if (!visibleEmails || visibleEmails.length === 0) {
		return (
			<div className="w-full max-w-[907px] mx-auto px-4">
				<div
					className="flex flex-col items-center space-y-2 overflow-y-auto overflow-x-hidden relative"
					style={{
						width: '907px',
						height: '657px',
						border: '3px solid #000000',
						borderRadius: '8px',
						padding: '16px',
						paddingTop: '109px', // 55px (search top) + 48px (search height) + 6px (gap) = 109px
						background: '#84b9f5',
					}}
				>
					{/* Three circles at top */}
					<svg
						width="9"
						height="9"
						viewBox="0 0 9 9"
						fill="none"
						style={{
							position: 'absolute',
							top: '9.5px',
							transform: 'translateY(-50%)',
							left: '17px',
							zIndex: 10,
						}}
					>
						<circle cx="4.5" cy="4.5" r="4.5" fill="#999999" />
					</svg>
					<svg
						width="9"
						height="9"
						viewBox="0 0 9 9"
						fill="none"
						style={{
							position: 'absolute',
							top: '9.5px',
							transform: 'translateY(-50%)',
							left: '78px',
							zIndex: 10,
						}}
					>
						<circle cx="4.5" cy="4.5" r="4.5" fill="#999999" />
					</svg>
					<svg
						width="9"
						height="9"
						viewBox="0 0 9 9"
						fill="none"
						style={{
							position: 'absolute',
							top: '9.5px',
							transform: 'translateY(-50%)',
							left: '139px',
							zIndex: 10,
						}}
					>
						<circle cx="4.5" cy="4.5" r="4.5" fill="#999999" />
					</svg>

					{/* Inbox/Sent Badge */}
					<div
						style={{
							position: 'absolute',
							top: '9.5px', // vertically center within 19px header
							transform: 'translateY(-50%)',
							left: '174px', // 139px (3rd circle left) + 9px (width) + 26px (gap)
							width: '69px',
							height: '18px',
							borderRadius: '11px',
							border: '3px solid #999999',
							backgroundColor: '#84b9f5',
							zIndex: 10,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<span
							className="text-[10px] font-bold leading-none"
							style={{ color: '#999999' }}
						>
							{activeTab === 'inbox' ? 'Inbox' : 'Sent'}
						</span>
					</div>

					{/* Search Bar - positioned 55px from top, left-aligned with emails */}
					<div
						style={{
							position: 'absolute',
							top: '55px',
							left: '14px',
							width: '725px',
							height: '48px',
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: '#3277c6',
							zIndex: 10,
							display: 'flex',
							alignItems: 'center',
							paddingLeft: '16px',
							pointerEvents: 'none',
						}}
					>
						<SearchIconDesktop />
						<input
							type="text"
							value={searchQuery}
							onChange={() => {}}
							placeholder=""
							disabled
							style={{
								flex: 1,
								height: '100%',
								border: 'none',
								outline: 'none',
								fontSize: '16px',
								fontFamily: 'Inter, sans-serif',
								color: '#000000',
								backgroundColor: 'transparent',
								marginLeft: '16px',
								paddingRight: '16px',
								cursor: 'not-allowed',
							}}
							className="placeholder:text-[#737373]"
						/>
					</div>

					{/* New box - 148x47px, right-aligned with emails, centered with search bar */}
					<div
						style={{
							position: 'absolute',
							top: '55.5px', // Centered with search bar: 55px + (48px/2) - (47px/2) = 55.5px
							right: '14px', // Right-aligned with emails (emails are 879px wide starting at 14px, so end at 893px; container is 907px, so 907-893=14px from right)
							width: '148px',
							height: '47px',
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: '#3277c6',
							zIndex: 10,
							display: 'flex',
							alignItems: 'center',
							padding: '4px',
							gap: '4px',
							pointerEvents: 'none',
						}}
					>
						{/* Inbox tab */}
						<button
							type="button"
							onClick={() => {}}
							disabled
							style={{
								width: '70px',
								height: '19px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								backgroundColor: activeTab === 'inbox' ? '#3277c6' : 'transparent',
								borderRadius: '8px',
								border: activeTab === 'inbox' ? '2px solid #000000' : 'none',
								cursor: 'not-allowed',
								padding: 0,
								margin: 0,
								outline: 'none',
								boxShadow: 'none',
								WebkitAppearance: 'none',
								appearance: 'none',
							}}
						>
							<span
								style={{
									fontSize: '14px',
									fontWeight: 500,
									color: 'transparent',
									fontFamily: 'Times New Roman, serif',
								}}
							>
								Inbox
							</span>
						</button>
						{/* Sent tab */}
						<button
							type="button"
							onClick={() => {}}
							disabled
							style={{
								width: '70px',
								height: '19px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								backgroundColor: activeTab === 'sent' ? '#3277c6' : 'transparent',
								borderRadius: '8px',
								border: activeTab === 'sent' ? '2px solid #000000' : 'none',
								cursor: 'not-allowed',
								padding: 0,
								margin: 0,
								outline: 'none',
								boxShadow: 'none',
								WebkitAppearance: 'none',
								appearance: 'none',
							}}
						>
							<span
								style={{
									fontSize: '14px',
									fontWeight: 500,
									color: 'transparent',
									fontFamily: 'Times New Roman, serif',
								}}
							>
								Sent
							</span>
						</button>
					</div>

					{Array.from({ length: 7 }).map((_, idx) => (
						<div
							key={`inbox-placeholder-${idx}`}
							className="select-none mb-2"
							style={{
								width: '879px',
								height: idx >= 1 && idx <= 4 ? '52px' : '78px',
								border: '3px solid #000000',
								borderRadius: '8px',
								backgroundColor: '#3277c6',
							}}
						/>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-[907px] mx-auto px-4">
			<CustomScrollbar
				className="flex flex-col items-center relative"
				contentClassName="flex flex-col items-center"
				thumbWidth={2}
				thumbColor="#000000"
				trackColor="transparent"
				offsetRight={-6}
				offsetTop={selectedEmail ? 0 : 109}
				disableOverflowClass
				style={{
					width: '907px',
					height: '657px',
					border: '3px solid #000000',
					borderRadius: '8px',
					padding: selectedEmail ? '21px 13px 12px 13px' : '16px',
					paddingTop: selectedEmail ? '21px' : '109px', // 55px (search top) + 48px (search height) + 6px (gap) = 109px
					background: selectedEmail
						? '#437ec1'
						: activeTab === 'sent'
						? 'linear-gradient(to bottom, #FFFFFF 19px, #5AB477 19px)'
						: 'linear-gradient(to bottom, #FFFFFF 19px, #6fa4e1 19px)',
				}}
			>
				{/* Back button - shown when email is selected */}
				{selectedEmail && (
					<button
						type="button"
						onClick={() => {
							setSelectedEmailId(null);
							setReplyMessage('');
						}}
						className="absolute cursor-pointer bg-transparent border-0 p-0 z-10"
						style={{
							top: '3px',
							left: '21px',
						}}
					>
						<svg
							width="34"
							height="15"
							viewBox="0 0 34 15"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M0.292892 6.65666C-0.0976295 7.04719 -0.0976295 7.68035 0.292892 8.07088L6.65685 14.4348C7.04738 14.8254 7.68054 14.8254 8.07107 14.4348C8.46159 14.0443 8.46159 13.4111 8.07107 13.0206L2.41421 7.36377L8.07107 1.70692C8.46159 1.31639 8.46159 0.683226 8.07107 0.292702C7.68054 -0.0978227 7.04738 -0.0978227 6.65685 0.292702L0.292892 6.65666ZM34 7.36377V6.36377L1 6.36377V7.36377V8.36377L34 8.36377V7.36377Z"
								fill="white"
							/>
						</svg>
					</button>
				)}
				{/* Three circles at top */}
				{!selectedEmail && (
					<>
						<svg
							width="9"
							height="9"
							viewBox="0 0 9 9"
							fill="none"
							style={{
								position: 'absolute',
								top: '9.5px',
								transform: 'translateY(-50%)',
								left: '17px',
								zIndex: 10,
							}}
						>
							<circle cx="4.5" cy="4.5" r="4.5" fill="#D9D9D9" />
						</svg>
						<svg
							width="9"
							height="9"
							viewBox="0 0 9 9"
							fill="none"
							style={{
								position: 'absolute',
								top: '9.5px',
								transform: 'translateY(-50%)',
								left: '78px',
								zIndex: 10,
							}}
						>
							<circle cx="4.5" cy="4.5" r="4.5" fill="#D9D9D9" />
						</svg>
						<svg
							width="9"
							height="9"
							viewBox="0 0 9 9"
							fill="none"
							style={{
								position: 'absolute',
								top: '9.5px',
								transform: 'translateY(-50%)',
								left: '139px',
								zIndex: 10,
							}}
						>
							<circle cx="4.5" cy="4.5" r="4.5" fill="#D9D9D9" />
						</svg>

						{/* Inbox Badge */}
						<div
							style={{
								position: 'absolute',
								top: '9.5px',
								transform: 'translateY(-50%)',
								left: '174px', // 139px (3rd circle left) + 9px (width) + 26px (gap)
								width: '69px',
								height: '18px',
								borderRadius: '11px',
								border: '3px solid #000000',
								backgroundColor: '#CCDFF4',
								zIndex: 10,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<span className="text-[10px] font-bold text-black leading-none">Inbox</span>
						</div>
					</>
				)}
				{/* Search Bar - positioned 55px from top, left-aligned with emails */}
				{!selectedEmail && (
					<div
						style={{
							position: 'absolute',
							top: '55px',
							left: '14px',
							width: '725px',
							height: '48px',
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: '#FFFFFF',
							zIndex: 10,
							display: 'flex',
							alignItems: 'center',
							paddingLeft: '16px',
						}}
					>
						<SearchIconDesktop />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search Mail"
							style={{
								flex: 1,
								height: '100%',
								border: 'none',
								outline: 'none',
								fontSize: '16px',
								fontFamily: 'Inter, sans-serif',
								color: '#000000',
								backgroundColor: 'transparent',
								marginLeft: '16px',
								paddingRight: '16px',
							}}
							className="placeholder:text-[#737373]"
						/>
					</div>
				)}
				{/* New box - 148x47px, right-aligned with emails, centered with search bar */}
				{!selectedEmail && (
					<div
						style={{
							position: 'absolute',
							top: '55.5px', // Centered with search bar: 55px + (48px/2) - (47px/2) = 55.5px
							right: '14px', // Right-aligned with emails (emails are 879px wide starting at 14px, so end at 893px; container is 907px, so 907-893=14px from right)
							width: '148px',
							height: '47px',
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: '#FFFFFF',
							zIndex: 10,
							display: 'flex',
							alignItems: 'center',
							padding: '4px',
							gap: '4px',
						}}
					>
						{/* Inbox tab */}
						<button
							type="button"
							onClick={() => handleTabChange('inbox')}
							style={{
								width: '70px',
								height: '19px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								backgroundColor:
									activeTab === 'inbox' ? 'rgba(93, 171, 104, 0.63)' : 'transparent',
								borderRadius: '8px',
								border: activeTab === 'inbox' ? '2px solid #000000' : 'none',
								cursor: 'pointer',
								padding: 0,
								margin: 0,
								outline: 'none',
								boxShadow: 'none',
								WebkitAppearance: 'none',
								appearance: 'none',
							}}
						>
							<span
								style={{
									fontSize: '14px',
									fontWeight: 500,
									color: '#000000',
									fontFamily: 'Times New Roman, serif',
								}}
							>
								Inbox
							</span>
						</button>
						{/* Sent tab */}
						<button
							type="button"
							onClick={() => handleTabChange('sent')}
							style={{
								width: '70px',
								height: '19px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								backgroundColor:
									activeTab === 'sent' ? 'rgba(93, 171, 104, 0.63)' : 'transparent',
								borderRadius: '8px',
								border: activeTab === 'sent' ? '2px solid #000000' : 'none',
								cursor: 'pointer',
								padding: 0,
								margin: 0,
								outline: 'none',
								boxShadow: 'none',
								WebkitAppearance: 'none',
								appearance: 'none',
							}}
						>
							<span
								style={{
									fontSize: '14px',
									fontWeight: 500,
									color: '#000000',
									fontFamily: 'Times New Roman, serif',
								}}
							>
								Sent
							</span>
						</button>
					</div>
				)}

				{selectedEmail ? (
					/* Expanded Email View Inside Box */
					<div
						className="w-full h-full flex flex-col"
						style={{
							width: '880px',
							border: '3px solid #000000',
							borderRadius: '8px',
							backgroundColor: '#5DA0EB',
							overflow: 'hidden',
						}}
					>
						{/* Top Header Section - 880x79px */}
						<div
							className="flex items-center px-4"
							style={{
								width: '100%',
								height: '79px',
								minHeight: '79px',
								backgroundColor: '#FFFFFF',
								borderBottom: '3px solid #000000',
								borderBottomLeftRadius: '8px',
								borderBottomRightRadius: '8px',
							}}
						>
							{/* Left side: Name, Company, Subject */}
							<div
								className="flex flex-col justify-center min-w-0"
								style={{ width: '200px', flexShrink: 0 }}
							>
								<span className="font-medium truncate">
									{getCanonicalContactName(selectedEmail, contactByEmail)}
								</span>
								{(() => {
									const companyLabel = getContactCompanyLabel(
										selectedEmail,
										contactByEmail
									);
									if (!companyLabel) return null;
									return (
										<span className="font-inter text-[14px] text-gray-500 truncate">
											{companyLabel}
										</span>
									);
								})()}
								<div className="text-sm font-medium truncate mt-1">
									{selectedEmail.subject || '(No Subject)'}
								</div>
							</div>
							{/* Right side: Badges + timestamp */}
							<div className="flex-1 flex items-center justify-end gap-2 min-w-0">
								{/* State/City and Title badges - stacked vertically */}
								{(() => {
									const contact = resolveContactForEmail(selectedEmail, contactByEmail);
									const headline = contact?.headline || contact?.title || '';
									const stateAbbr = contact
										? getStateAbbreviation(contact.state || '') || ''
										: '';
									const stateName = contact?.state || '';
									return (
										<div
											className="flex flex-col items-start gap-1 flex-shrink-0 mr-auto"
											style={{ marginLeft: '35%' }}
										>
											{stateAbbr && (
												<div className="flex items-center gap-1">
													<span
														className="inline-flex items-center justify-center rounded-[6px] border text-[12px] leading-none font-bold"
														style={{
															width: '28px',
															height: '20px',
															backgroundColor:
																stateBadgeColorMap[stateAbbr] || 'transparent',
															borderColor: '#000000',
														}}
													>
														{stateAbbr}
													</span>
													{stateName && (
														<span className="text-[12px] text-black">{stateName}</span>
													)}
												</div>
											)}
											{headline && (
												<div
													className="h-[21px] max-w-[160px] rounded-[6px] px-2 flex items-center border border-black overflow-hidden"
													style={{ backgroundColor: '#e8efff' }}
												>
													<span className="text-[10px] text-black leading-none truncate">
														{headline}
													</span>
												</div>
											)}
										</div>
									);
								})()}
								{/* Timestamp */}
								<div className="text-sm text-black whitespace-nowrap flex-shrink-0 ml-4">
									{selectedEmail.receivedAt
										? new Date(selectedEmail.receivedAt)
												.toLocaleTimeString([], {
													hour: 'numeric',
													minute: '2-digit',
													hour12: true,
												})
												.toLowerCase()
										: ''}
								</div>
							</div>
						</div>

						{/* Content Section */}
						<div
							className="flex-1 overflow-y-auto flex flex-col"
							style={{ paddingBottom: '18px' }}
						>
							{/* Email Body Box - 828x326px, 19px below header */}
							<div
								style={{
									width: '828px',
									height: '326px',
									marginTop: '19px',
									marginLeft: activeTab === 'sent' ? 'auto' : 0,
									marginRight: activeTab === 'sent' ? 0 : 'auto',
									alignSelf: activeTab === 'sent' ? 'flex-end' : 'flex-start',
									backgroundColor: activeTab === 'sent' ? '#FFFFFF' : '#E5F1FF',
									border: '3px solid #000000',
									borderRadius: '8px',
									padding: '16px',
									overflowY: 'auto',
								}}
							>
								{/* Date/time header */}
								<div className="text-sm text-black mb-4">
									{selectedEmail.receivedAt
										? (() => {
												const date = new Date(selectedEmail.receivedAt);
												const now = new Date();
												const diffTime = Math.abs(now.getTime() - date.getTime());
												const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
												const dayName = date.toLocaleDateString('en-US', {
													weekday: 'long',
												});
												const monthDay = date.toLocaleDateString('en-US', {
													month: 'long',
													day: 'numeric',
												});
												const time = date
													.toLocaleTimeString([], {
														hour: 'numeric',
														minute: '2-digit',
														hour12: true,
													})
													.toLowerCase();
												const ago =
													diffDays === 0
														? 'today'
														: diffDays === 1
														? '1 day ago'
														: `${diffDays} days ago`;
												return `${dayName}, ${monthDay} ${time} (${ago})`;
										  })()
										: ''}
								</div>

								{/* Email body */}
								<div className="text-sm">
									{selectedEmail.bodyHtml ? (
										<div
											dangerouslySetInnerHTML={{
												__html: stripQuotedReplyHtml(selectedEmail.bodyHtml),
											}}
											className="prose prose-sm max-w-none"
										/>
									) : (
										<div className="whitespace-pre-wrap">
											{stripQuotedReply(
												selectedEmail.strippedText || selectedEmail.bodyPlain || ''
											) || 'No content'}
										</div>
									)}
								</div>
							</div>

							{/* Sent Replies - Right aligned */}
							{(sentReplies[selectedEmail.id] || []).map((reply, index) => (
								<div
									key={index}
									style={{
										width: '828px',
										height: '326px',
										marginTop: '19px',
										marginRight: 0,
										alignSelf: 'flex-end',
										backgroundColor: '#FFFFFF',
										border: '3px solid #000000',
										borderRadius: '8px',
										padding: '16px',
										overflowY: 'auto',
									}}
								>
									{/* Date/time header */}
									<div className="text-sm text-black mb-4">
										{(() => {
											const date = reply.timestamp;
											const now = new Date();
											const diffTime = Math.abs(now.getTime() - date.getTime());
											const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
											const dayName = date.toLocaleDateString('en-US', {
												weekday: 'long',
											});
											const monthDay = date.toLocaleDateString('en-US', {
												month: 'long',
												day: 'numeric',
											});
											const time = date
												.toLocaleTimeString([], {
													hour: 'numeric',
													minute: '2-digit',
													hour12: true,
												})
												.toLowerCase();
											const ago =
												diffDays === 0
													? 'today'
													: diffDays === 1
													? '1 day ago'
													: `${diffDays} days ago`;
											return `${dayName}, ${monthDay} ${time} (${ago})`;
										})()}
									</div>

									{/* Reply body */}
									<div className="text-sm whitespace-pre-wrap">{reply.message}</div>
								</div>
							))}

							{/* Reply Box - only show for inbox emails */}
							{activeTab === 'inbox' && !selectedEmail?.isSent && (
								<div className="w-full flex justify-center" style={{ marginTop: '49px' }}>
									<div
										style={{
											width: '828px',
											minWidth: '828px',
											maxWidth: '828px',
											border: '3px solid #000000',
											borderRadius: '8px',
											backgroundColor: '#FFFFFF',
											overflow: 'hidden',
										}}
									>
										<textarea
											value={replyMessage}
											onChange={(e) => setReplyMessage(e.target.value)}
											placeholder=""
											className="w-full resize-none focus:outline-none"
											style={{
												height: '121px',
												padding: '16px',
												border: 'none',
											}}
											disabled={isSending}
										/>
										<Button
											onClick={handleSendReply}
											disabled={!replyMessage.trim() || isSending}
											className="w-full rounded-none bg-[#E1EDF5] text-black disabled:opacity-50 disabled:cursor-not-allowed"
											style={{
												height: '36px',
												borderTop: '3px solid #000000',
												borderRadius: 0,
												fontWeight: 500,
											}}
										>
											{isSending ? 'Sending...' : 'Reply'}
										</Button>
									</div>
								</div>
							)}
						</div>
					</div>
				) : (
					/* Email List View */
					<>
						{visibleEmails.map((email) => (
							<div
								key={email.id}
								className="bg-white hover:bg-gray-50 cursor-pointer px-4 flex items-center mb-2"
								style={{
									width: '879px',
									height: '78px',
									minHeight: '78px',
									border: '3px solid #000000',
									borderRadius: '8px',
									backgroundColor: '#FFFFFF',
								}}
								onClick={() => {
									setSelectedEmailId(email.id);
									setReplyMessage('');
								}}
							>
								<div className="flex gap-3 w-full h-full">
									{/* Left side: Name, Company, Subject */}
									<div
										className="flex flex-col justify-center min-w-0"
										style={{ width: '200px', flexShrink: 0 }}
									>
										<div className="flex items-center gap-2">
											<span className="font-medium truncate">
												{getCanonicalContactName(email, contactByEmail)}
											</span>
										</div>
										{(() => {
											const companyLabel = getContactCompanyLabel(email, contactByEmail);
											if (!companyLabel) return null;
											return (
												<span className="font-inter text-[17px] font-medium text-gray-500 truncate">
													{companyLabel}
												</span>
											);
										})()}
										<div className="text-sm font-medium truncate mt-1">
											{email.subject || '(No Subject)'}
										</div>
									</div>
									{/* Right side: Badges + Body preview + date in a row */}
									<div className="flex-1 flex items-start gap-2 min-w-0 pt-[10px]">
										{/* Title and State badges */}
										{(() => {
											const contact = resolveContactForEmail(email, contactByEmail);
											const headline = contact?.headline || contact?.title || '';
											const stateAbbr = contact
												? getStateAbbreviation(contact.state || '') || ''
												: '';
											return (
												<>
													{headline && (
														<div className="h-[21px] max-w-[160px] rounded-[6px] px-2 flex items-center bg-[#E8EFFF] border border-black overflow-hidden flex-shrink-0">
															<span className="text-[10px] text-black leading-none truncate">
																{headline}
															</span>
														</div>
													)}
													{stateAbbr && (
														<span
															className="inline-flex items-center justify-center rounded-[6px] border text-[12px] leading-none font-bold flex-shrink-0"
															style={{
																width: '39px',
																height: '20px',
																backgroundColor:
																	stateBadgeColorMap[stateAbbr] || 'transparent',
																borderColor: '#000000',
															}}
														>
															{stateAbbr}
														</span>
													)}
												</>
											);
										})()}
										{/* Email body preview */}
										<div className="flex-1 text-sm text-[#000000] line-clamp-2 min-w-0 pt-[7px]">
											{email.strippedText?.slice(0, 120) ||
												email.bodyPlain?.slice(0, 120) ||
												''}
										</div>
										{/* Date */}
										<div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
											{email.receivedAt
												? new Date(email.receivedAt).toLocaleDateString()
												: ''}
										</div>
									</div>
								</div>
							</div>
						))}
						{Array.from({
							length: Math.max(0, 6 - (visibleEmails?.length ?? 0)),
						}).map((_, idx) => (
							<div
								key={`inbox-placeholder-${idx}`}
								className="select-none mb-2"
								style={{
									width: '879px',
									height: '78px',
									minHeight: '78px',
									border: '3px solid #000000',
									borderRadius: '8px',
									backgroundColor: activeTab === 'inbox' ? '#6fa4e1' : '#5AB477',
								}}
							/>
						))}
					</>
				)}
			</CustomScrollbar>
		</div>
	);
};

export default InboxSection;
