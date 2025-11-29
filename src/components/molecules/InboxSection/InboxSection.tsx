'use client';

import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import { useMe } from '@/hooks/useMe';

export const InboxSection: FC = () => {
	const { data: inboundEmails, isLoading, error } = useGetInboundEmails();
	const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
	const [replyMessage, setReplyMessage] = useState('');
	const [isSending, setIsSending] = useState(false);

	const { user } = useMe();
	const { mutateAsync: sendMailgunMessage } = useSendMailgunMessage({
		successMessage: 'Reply sent successfully',
		errorMessage: 'Failed to send reply',
	});

	const selectedEmail = inboundEmails?.find((email) => email.id === selectedEmailId);

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
			<div className="w-full max-w-[998px] mx-auto px-4">
				<div
					className="flex items-center justify-center"
					style={{
						width: '998px',
						height: '400px',
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
			<div className="w-full max-w-[998px] mx-auto px-4">
				<div
					className="flex items-center justify-center"
					style={{
						width: '998px',
						height: '400px',
						border: '2px solid #000000',
						borderRadius: '8px',
					}}
				>
					<div className="text-red-500">Failed to load emails</div>
				</div>
			</div>
		);
	}

	if (!inboundEmails || inboundEmails.length === 0) {
		return (
			<div className="w-full max-w-[998px] mx-auto px-4">
				<div
					className="flex flex-col items-center space-y-2 overflow-y-auto overflow-x-hidden"
					style={{
						width: '998px',
						height: '400px',
						border: '2px solid #000000',
						borderRadius: '8px',
						padding: '16px',
						paddingTop: '40px',
						backgroundColor: '#4CA9DB',
					}}
				>
					{Array.from({ length: 3 }).map((_, idx) => (
						<div
							key={`inbox-placeholder-${idx}`}
							className="select-none"
							style={{
								width: '967px',
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
		<div className="w-full max-w-[998px] mx-auto px-4">
			<div
				className="flex flex-col items-center overflow-y-auto overflow-x-hidden"
				style={{
					width: '998px',
					height: '558px',
					border: '2px solid #000000',
					borderRadius: '8px',
					padding: '16px',
					paddingTop: selectedEmail ? '16px' : '40px',
					backgroundColor: '#4CA9DB',
				}}
			>
				{selectedEmail ? (
					/* Expanded Email View Inside Box */
					<div
						className="w-full h-full overflow-y-auto"
						style={{
							width: '967px',
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
						{inboundEmails.map((email) => (
							<div
								key={email.id}
								className="bg-white hover:bg-gray-50 cursor-pointer px-4 flex items-center mb-2"
								style={{
									width: '967px',
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
						{Array.from({ length: Math.max(0, 5 - inboundEmails.length) }).map(
							(_, idx) => (
								<div
									key={`inbox-placeholder-${idx}`}
									className="select-none mb-2"
									style={{
										width: '967px',
										height: '78px',
										minHeight: '78px',
										border: '2px solid #000000',
										borderRadius: '8px',
										backgroundColor: '#FFFFFF',
									}}
								/>
							)
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default InboxSection;


