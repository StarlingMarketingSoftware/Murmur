'use client';

import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils';
import { useMe } from '@/hooks/useMe';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import {
	useMarkConversationRead,
	useSendConversationReply,
} from '@/hooks/queryHooks/useConversations';
import {
	getInboxMessageSnippet,
	getInboxMessageTimeMs,
	stripQuotedReply,
	type InboxConversation,
	type InboxConversationMessage,
} from '@/utils/inboxConversations';
import {
	InboxRichReplyEditor,
	isRichTextMessageEmpty,
} from '@/components/molecules/InboxSection/InboxRichReplyEditor';
import { sanitizeMessageHtml } from '@/utils/sanitizeMessageHtml';
import { convertHtmlToPlainText } from '@/utils/html';
import { ContactWithName } from '@/types/contact';
import {
	MobileContactHeader,
	type MobileContactHeaderTheme,
} from './MobileContactHeader';

// Avatar fills shared with the campaign inbox thread (green = current user, blue = contact).
const USER_AVATAR_FILL = '#67C76D';
const CONTACT_AVATAR_FILL = '#86C7E8';
const INBOUND_BLOCK_FILL = '#E5F1FF';
// Messenger (3+ item) thread colors — keep in sync with the desktop campaign
// inbox's INBOX_MESSENGER_* constants (InboxSection.tsx).
const MESSENGER_THREAD_BACKGROUND = '#DCF1FF';
const MESSENGER_OUTBOUND_BACKGROUND = '#ACD2FF';
const MESSENGER_INBOUND_BACKGROUND = '#FFFFFF';

const getAvatarInitial = (value: string): string =>
	value.trim().charAt(0).toUpperCase() || '?';

// "6.17 (2 days ago)" — same format as the campaign inbox thread timestamps.
const formatThreadTimestamp = (value: string | Date | null | undefined): string => {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	const time = date
		.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
		.replace(/\s?[AP]M/i, '')
		.replace(':', '.');
	const diffDays = Math.floor(Math.abs(Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
	const ago = diffDays === 0 ? 'today' : `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
	return `${time} (${ago})`;
};

const getMessageBody = (message: InboxConversationMessage): string =>
	stripQuotedReply(message.strippedText || message.bodyPlain || '') ||
	getInboxMessageSnippet(message) ||
	'No content';

const Avatar: FC<{ initial: string; fill: string; size?: number; fontSize?: number }> = ({
	initial,
	fill,
	size = 25,
	fontSize,
}) => (
	<span
		className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
		style={{
			width: size,
			height: size,
			backgroundColor: fill,
			fontSize: fontSize ?? size * 0.52,
		}}
	>
		{initial}
	</span>
);

interface MobileConversationViewProps {
	conversation: InboxConversation;
	/** Resolved campaign contact for this conversation (canonical name/company/coords). */
	contact: ContactWithName | null;
	onClose: () => void;
	/** Keeps the campaign page's optimistic reply machinery in sync. */
	onThreadReplySent?: (messageIds: number[], sentAtMs: number) => void;
}

export const MobileConversationView: FC<MobileConversationViewProps> = ({
	conversation,
	contact,
	onClose,
	onThreadReplySent,
}) => {
	const { user } = useMe();
	const { mutateAsync: sendMailgunMessage } = useSendMailgunMessage({
		successMessage: 'Reply sent successfully',
		errorMessage: 'Failed to send reply',
	});
	const { mutateAsync: sendVenueReply } = useSendConversationReply();
	const { mutate: markConversationRead } = useMarkConversationRead();

	const [replyMessage, setReplyMessage] = useState('');
	const [isSending, setIsSending] = useState(false);
	const [pendingReplies, setPendingReplies] = useState<
		Array<{ message: string; timestamp: Date }>
	>([]);
	const [repliedAtMs, setRepliedAtMs] = useState<number | null>(null);

	const latestMessage = conversation.latestMessage;
	const latestInbound = conversation.latestInboundMessage;

	// Mirrors the desktop inbox rule exactly (InboxSection.tsx
	// selectedVisibleThreadItemCount >= 3): short threads keep the email-block
	// UI; 3+ visible items (messages + optimistic replies) render as chat bubbles.
	const usesMessengerLayout = conversation.messages.length + pendingReplies.length >= 3;

	// Default expansion: the latest inbound message, plus the latest message when it's
	// the user's own reply. Older messages collapse to one-line rows.
	const [expandedIds, setExpandedIds] = useState<Set<number>>(() => {
		const ids = new Set<number>();
		if (latestInbound) ids.add(latestInbound.id);
		if (latestMessage.isSent) ids.add(latestMessage.id);
		return ids;
	});
	useEffect(() => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (latestInbound) next.add(latestInbound.id);
			if (latestMessage.isSent) next.add(latestMessage.id);
			return next;
		});
	}, [latestInbound, latestMessage]);

	const toggleExpanded = (id: number) =>
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});

	// Green "waiting for their reply" theme once the thread ends with the user's message;
	// reverts to blue automatically when a newer inbound arrives via refetch.
	const isReplySentTheme =
		Boolean(latestMessage.isSent) ||
		pendingReplies.length > 0 ||
		(repliedAtMs != null && getInboxMessageTimeMs(latestMessage) <= repliedAtMs);
	const headerTheme: MobileContactHeaderTheme = isReplySentTheme
		? 'chatGreen'
		: 'chatBlue';

	const contactName = useMemo(() => {
		const personName =
			contact?.name || `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
		return (
			personName ||
			contact?.company ||
			latestInbound?.senderName?.trim() ||
			latestInbound?.sender?.trim() ||
			'Unknown sender'
		);
	}, [contact, latestInbound]);
	const contactCompanyLabel =
		contact?.company && contactName !== contact.company ? contact.company : null;
	const userName =
		user?.firstName && user?.lastName
			? `${user.firstName} ${user.lastName}`
			: user?.firstName || 'Me';

	// Venue threads: clear the unread state for this thread shortly after opening
	// (same convention as the campaign inbox).
	useEffect(() => {
		const venueConversationId = latestInbound?.venueConversationId;
		if (venueConversationId == null) return;
		const timeout = setTimeout(() => {
			markConversationRead({
				conversationId: venueConversationId,
				applicationId: latestInbound?.venueThreadApplicationId ?? undefined,
			});
		}, 1000);
		return () => clearTimeout(timeout);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [latestInbound?.id]);

	// Keep the thread pinned to the newest message.
	const bottomRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ block: 'end' });
	}, [pendingReplies.length, conversation.messages.length]);

	const handleSendReply = async (html: string) => {
		if (isSending || isRichTextMessageEmpty(html)) return;
		const target = latestInbound ?? latestMessage;
		const sentAtMs = Date.now();

		// Optimistic: show the reply and flip the header green immediately.
		setRepliedAtMs(sentAtMs);
		setPendingReplies((prev) => [...prev, { message: html, timestamp: new Date() }]);
		const revertOptimistic = () => {
			setPendingReplies((prev) => prev.slice(0, -1));
			setRepliedAtMs(null);
		};

		setIsSending(true);
		try {
			if (target.venueConversationId != null) {
				// Venue rows are projected internal messages — reply through the messaging
				// system (their sender is a placeholder address), not Mailgun.
				await sendVenueReply({
					conversationId: target.venueConversationId,
					body: convertHtmlToPlainText(html),
					threadApplicationId: target.venueThreadApplicationId ?? undefined,
				});
			} else {
				const senderEmail =
					user?.customDomain && user?.customDomain !== ''
						? user?.customDomain
						: user?.murmurEmail;
				if (!senderEmail) {
					console.error('No sender email configured');
					revertOptimistic();
					return;
				}
				const replySubject = target.subject?.startsWith('Re:')
					? target.subject
					: `Re: ${target.subject || '(No Subject)'}`;
				await sendMailgunMessage({
					recipientEmail: target.sender,
					subject: replySubject,
					message: html,
					senderEmail,
					senderName: userName === 'Me' ? 'Murmur User' : userName,
					originEmail: senderEmail,
					replyToEmail: user?.replyToEmail ?? user?.murmurEmail ?? undefined,
				});
			}

			const messageIds = conversation.messages.map((message) => message.id);
			if (messageIds.length > 0) onThreadReplySent?.(messageIds, sentAtMs);
			setReplyMessage('');
		} catch (error) {
			revertOptimistic();
			console.error('Failed to send reply:', error);
		} finally {
			setIsSending(false);
		}
	};

	const renderMessage = (message: InboxConversationMessage) => {
		const isSent = Boolean(message.isSent);
		const senderName = isSent ? userName : contactName;

		if (usesMessengerLayout) {
			return (
				<div
					key={`${isSent ? 'sent' : 'inbound'}-${message.id}`}
					className="flex w-full items-end"
					style={{
						justifyContent: isSent ? 'flex-end' : 'flex-start',
						gap: '8px',
						flexShrink: 0,
					}}
				>
					{/* Desktop messenger mode uses green for inbound avatars (not the
					    contact blue) — keep parity. */}
					{!isSent && (
						<Avatar
							initial={getAvatarInitial(senderName)}
							fill={USER_AVATAR_FILL}
							size={24}
							fontSize={13}
						/>
					)}
					<div
						className="whitespace-pre-wrap"
						style={{
							maxWidth: '78%',
							backgroundColor: isSent
								? MESSENGER_OUTBOUND_BACKGROUND
								: MESSENGER_INBOUND_BACKGROUND,
							border: '2px solid #000000',
							borderRadius: isSent ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
							padding: '8px 12px',
							boxSizing: 'border-box',
							fontSize: '13px',
							lineHeight: 1.35,
							color: '#000000',
						}}
					>
						{getMessageBody(message)}
					</div>
				</div>
			);
		}

		const isExpanded = expandedIds.has(message.id);

		if (!isExpanded) {
			return (
				<button
					key={`${isSent ? 'sent' : 'inbound'}-${message.id}`}
					type="button"
					onClick={() => toggleExpanded(message.id)}
					className="w-full flex items-center gap-[10px] px-4 py-[10px] border-b border-black/15 bg-white text-left"
				>
					<Avatar
						initial={getAvatarInitial(senderName)}
						fill={isSent ? USER_AVATAR_FILL : CONTACT_AVATAR_FILL}
						size={24}
					/>
					<span className="font-inter text-[14px] font-bold text-black shrink-0 truncate max-w-[40%]">
						{senderName}
					</span>
					<span className="flex-1 min-w-0 truncate font-inter text-[13px] text-black/60">
						{getInboxMessageSnippet(message)}
					</span>
				</button>
			);
		}

		return (
			<div
				key={`${isSent ? 'sent' : 'inbound'}-${message.id}`}
				className="border-b border-black/15"
				style={{ backgroundColor: isSent ? '#FFFFFF' : INBOUND_BLOCK_FILL }}
			>
				<button
					type="button"
					onClick={() => toggleExpanded(message.id)}
					className="w-full flex items-center gap-[10px] px-4 pt-[13px] text-left"
				>
					<Avatar
						initial={getAvatarInitial(senderName)}
						fill={isSent ? USER_AVATAR_FILL : CONTACT_AVATAR_FILL}
					/>
					<span className="font-inter text-[15px] font-bold text-black truncate">
						{senderName}
					</span>
					{!isSent && contactCompanyLabel && (
						<span className="font-inter text-[13px] text-black truncate">
							{contactCompanyLabel}
						</span>
					)}
					<span className="ml-auto flex-shrink-0 font-inter text-[12px] text-black/70">
						{formatThreadTimestamp(message.receivedAt ?? message.createdAt)}
					</span>
				</button>
				<div className="px-4 pb-[14px]">
					<p className="font-inter text-[14px] leading-[1.4] text-black whitespace-pre-wrap mt-[8px] pl-[35px]">
						{getMessageBody(message)}
					</p>
				</div>
			</div>
		);
	};

	// Portal to <body>: the summary overlay's z-30 container is its own stacking
	// context, so only a portal can cover the layout's fixed avatar/dashboard
	// buttons (z-50).
	return createPortal(
		<div className="fixed inset-0 z-[60] flex flex-col bg-white font-inter">
			<MobileContactHeader
				name={contactName}
				company={contactCompanyLabel}
				latitude={contact?.latitude}
				longitude={contact?.longitude}
				theme={headerTheme}
				onMinimize={onClose}
			/>

			<div
				className={cn(
					'flex-1 min-h-0 overflow-y-auto',
					usesMessengerLayout && 'flex flex-col gap-[14px] px-[16px] py-[16px]'
				)}
				style={{
					WebkitOverflowScrolling: 'touch',
					backgroundColor: usesMessengerLayout ? MESSENGER_THREAD_BACKGROUND : undefined,
				}}
			>
				{conversation.messages.map(renderMessage)}
				{/* Optimistic replies not yet in the inbound feed */}
				{pendingReplies.map((reply, index) =>
					usesMessengerLayout ? (
						<div
							key={`pending-${index}`}
							className="flex w-full justify-end"
							style={{ flexShrink: 0 }}
						>
							<div
								className="[&_p]:m-0"
								style={{
									maxWidth: '78%',
									backgroundColor: MESSENGER_OUTBOUND_BACKGROUND,
									border: '2px solid #000000',
									borderRadius: '20px 20px 6px 20px',
									padding: '8px 12px',
									boxSizing: 'border-box',
									fontSize: '13px',
									lineHeight: 1.35,
									color: '#000000',
								}}
								dangerouslySetInnerHTML={{
									__html: sanitizeMessageHtml(reply.message),
								}}
							/>
						</div>
					) : (
						<div key={`pending-${index}`} className="border-b border-black/15 bg-white">
							<div className="flex items-center gap-[10px] px-4 pt-[13px]">
								<Avatar initial={getAvatarInitial(userName)} fill={USER_AVATAR_FILL} />
								<span className="font-inter text-[15px] font-bold text-black truncate">
									{userName}
								</span>
								<span className="ml-auto flex-shrink-0 font-inter text-[12px] text-black/70">
									{formatThreadTimestamp(reply.timestamp)}
								</span>
							</div>
							<div className="px-4 pb-[14px]">
								<div
									className="font-inter text-[14px] leading-[1.4] text-black mt-[8px] pl-[35px] [&_p]:m-0"
									dangerouslySetInnerHTML={{
										__html: sanitizeMessageHtml(reply.message),
									}}
								/>
							</div>
						</div>
					)
				)}
				<div ref={bottomRef} />
			</div>

			<div
				className={cn('flex-shrink-0 px-3 pt-2')}
				style={{
					backgroundColor: isReplySentTheme ? '#E2F4E9' : '#E0EEF7',
					paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
				}}
			>
				<InboxRichReplyEditor
					value={replyMessage}
					onChange={setReplyMessage}
					onSend={handleSendReply}
					isSending={isSending}
					isMobile
					variant="pill"
					containerStyle={{ position: 'relative', width: '100%', height: '37px' }}
				/>
			</div>
		</div>,
		document.body
	);
};
