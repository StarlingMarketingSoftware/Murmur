'use client';

import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import { useMe } from '@/hooks/useMe';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';

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
}

export const InboxSection: FC<InboxSectionProps> = ({ allowedSenderEmails }) => {
	const { data: inboundEmails, isLoading, error } = useGetInboundEmails();
	const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
	const [replyMessage, setReplyMessage] = useState('');
	const [isSending, setIsSending] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

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

	// Further filter by search query (sender, subject, body)
	const visibleEmails = filteredBySender?.filter((email) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		const sender = email.sender?.toLowerCase() || '';
		const senderName = email.senderName?.toLowerCase() || '';
		const subject = email.subject?.toLowerCase() || '';
		const body = (email.strippedText || email.bodyPlain || '').toLowerCase();
		return (
			sender.includes(query) ||
			senderName.includes(query) ||
			subject.includes(query) ||
			body.includes(query)
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
						border: '2px solid #000000',
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
						border: '2px solid #000000',
						borderRadius: '8px',
					}}
				>
					<div className="text-red-500">Failed to load emails</div>
				</div>
			</div>
		);
	}

	if (!visibleEmails || visibleEmails.length === 0) {
		return (
			<div className="w-full max-w-[907px] mx-auto px-4">
				<div
				className="flex flex-col items-center space-y-2 overflow-y-auto overflow-x-hidden relative"
				style={{
					width: '907px',
					height: '657px',
					border: '2px solid #000000',
					borderRadius: '8px',
					padding: '16px',
					paddingTop: '109px', // 55px (search top) + 48px (search height) + 6px (gap) = 109px
					background: 'linear-gradient(to bottom, #FFFFFF 19px, #6fa4e1 19px)',
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
							top: '9.5px', // vertically center within 19px header
							transform: 'translateY(-50%)',
							left: '174px', // 139px (3rd circle left) + 9px (width) + 26px (gap)
							width: '69px',
							height: '18px',
							borderRadius: '11px',
							border: '2px solid #000000',
							backgroundColor: '#CCDFF4',
							zIndex: 10,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<span className="text-[10px] font-bold text-black leading-none">
							Inbox
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
							border: '2px solid #000000',
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
								fontSize: '20px',
								fontFamily: 'Inter, sans-serif',
								color: '#000000',
								backgroundColor: 'transparent',
								marginLeft: '12px',
								paddingRight: '16px',
							}}
							className="placeholder:text-[#737373]"
						/>
					</div>

					{Array.from({ length: 3 }).map((_, idx) => (
						<div
							key={`inbox-placeholder-${idx}`}
							className="select-none"
							style={{
								width: '879px',
								height: '78px',
								border: '2px solid #000000',
								borderRadius: '8px',
								backgroundColor: '#FFFFFF',
							}}
						/>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="w-full max-w-[907px] mx-auto px-4">
			<div
				className="flex flex-col items-center overflow-y-auto overflow-x-hidden relative"
				style={{
					width: '907px',
					height: '657px',
					border: '2px solid #000000',
					borderRadius: '8px',
					padding: '16px',
					paddingTop: selectedEmail ? '16px' : '109px', // 55px (search top) + 48px (search height) + 6px (gap) = 109px
					background: selectedEmail ? '#6fa4e1' : 'linear-gradient(to bottom, #FFFFFF 19px, #6fa4e1 19px)',
				}}
			>
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
								border: '2px solid #000000',
								backgroundColor: '#CCDFF4',
								zIndex: 10,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<span className="text-[10px] font-bold text-black leading-none">
								Inbox
							</span>
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
							border: '2px solid #000000',
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
								fontSize: '20px',
								fontFamily: 'Inter, sans-serif',
								color: '#000000',
								backgroundColor: 'transparent',
								marginLeft: '12px',
								paddingRight: '16px',
							}}
							className="placeholder:text-[#737373]"
						/>
					</div>
				)}

				{selectedEmail ? (
					/* Expanded Email View Inside Box */
					<div
						className="w-full h-full overflow-y-auto"
						style={{
							width: '879px',
							border: '2px solid #000000',
							borderRadius: '8px',
							backgroundColor: '#FFFFFF',
							padding: '20px',
						}}
					>
						<div className="flex justify-between items-start mb-4">
							<div>
								<div className="text-lg font-bold">
									{selectedEmail.subject || '(No Subject)'}
								</div>
								<div className="text-sm text-gray-600 mt-1">
									From: {selectedEmail.senderName || selectedEmail.sender}
									{selectedEmail.contact && (
										<span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
											{selectedEmail.contact.firstName && selectedEmail.contact.lastName
												? `${selectedEmail.contact.firstName} ${selectedEmail.contact.lastName}`
												: selectedEmail.contact.firstName || selectedEmail.contact.email}
										</span>
									)}
								</div>
								<div className="text-xs text-gray-400 mt-1">
									{selectedEmail.receivedAt
										? new Date(selectedEmail.receivedAt).toLocaleString()
										: ''}
								</div>
								{selectedEmail.campaign && (
									<div className="text-xs text-gray-500 mt-1">
										Campaign: {selectedEmail.campaign.name}
									</div>
								)}
							</div>
							<button
								onClick={() => {
									setSelectedEmailId(null);
									setReplyMessage('');
								}}
								className="text-gray-500 hover:text-gray-700 text-xl font-bold px-2"
							>
								×
							</button>
						</div>
						<div className="border-t pt-4 text-sm">
							{selectedEmail.bodyHtml ? (
								<div
									dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
									className="prose prose-sm max-w-none"
								/>
							) : (
								<div className="whitespace-pre-wrap">
									{selectedEmail.strippedText || selectedEmail.bodyPlain || 'No content'}
								</div>
							)}
						</div>

						{/* Reply Box */}
						<div className="border-t mt-4 pt-4">
							<div className="text-sm font-medium mb-2">Reply</div>
							<textarea
								value={replyMessage}
								onChange={(e) => setReplyMessage(e.target.value)}
								placeholder="Type your reply..."
								className="w-full p-3 border-2 border-black rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
								rows={4}
								disabled={isSending}
							/>
							<div className="flex justify-end mt-2">
								<Button
									onClick={handleSendReply}
									disabled={!replyMessage.trim() || isSending}
									className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isSending ? 'Sending...' : 'Send Reply'}
								</Button>
							</div>
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
									border: '2px solid #000000',
									borderRadius: '8px',
									backgroundColor: '#FFFFFF',
								}}
								onClick={() => {
									setSelectedEmailId(email.id);
									setReplyMessage('');
								}}
							>
								<div className="flex justify-between items-center gap-4 w-full">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<span className="font-medium truncate">
												{email.senderName || email.sender}
											</span>
											{email.contact && (
												<span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
													{email.contact.firstName && email.contact.lastName
														? `${email.contact.firstName} ${email.contact.lastName}`
														: email.contact.firstName || email.contact.email}
												</span>
											)}
											{email.campaign && (
												<span className="text-xs text-gray-500">
													• {email.campaign.name}
												</span>
											)}
										</div>
										<div className="text-sm font-medium truncate">
											{email.subject || '(No Subject)'}
										</div>
										<div className="text-sm text-gray-500 truncate">
											{email.strippedText?.slice(0, 80) ||
												email.bodyPlain?.slice(0, 80) ||
												''}
										</div>
									</div>
									<div className="text-xs text-gray-400 whitespace-nowrap">
										{email.receivedAt
											? new Date(email.receivedAt).toLocaleDateString()
											: ''}
									</div>
								</div>
							</div>
						))}
						{Array.from({
							length: Math.max(0, 5 - (visibleEmails?.length ?? 0)),
						}).map((_, idx) => (
							<div
								key={`inbox-placeholder-${idx}`}
								className="select-none mb-2"
								style={{
									width: '879px',
									height: '78px',
									minHeight: '78px',
									border: '2px solid #000000',
									borderRadius: '8px',
									backgroundColor: '#FFFFFF',
								}}
							/>
						))}
					</>
				)}
			</div>
		</div>
	);
};

export default InboxSection;
