// Sanity check: confirm venue replies get projected into the inbound feed.
// Finds a conversation that has a venue-authored message, then runs
// projectVenueRepliesForUser for that conversation's standard (artist) user and
// prints what would land in their Responses folder.
//
// Run: npx tsx scripts/check-venue-inbound-projection.ts

import prisma from '@/lib/prisma';
import { MessageSender } from '@prisma/client';
import { projectVenueRepliesForUser } from '@/app/api/_utils/venueInboundProjection';

async function main() {
	const venueMessage = await prisma.message.findFirst({
		where: { sender: MessageSender.venue },
		orderBy: { id: 'desc' },
	});
	if (!venueMessage) {
		console.log('No venue-authored messages found in the DB — nothing to project.');
		return;
	}

	const conversation = await prisma.conversation.findUnique({
		where: { id: venueMessage.conversationId },
		select: { id: true, standardUserId: true, venueId: true },
	});
	if (!conversation) {
		console.log('Conversation not found for venue message', venueMessage.id);
		return;
	}

	console.log('Latest venue message:', {
		id: venueMessage.id,
		conversationId: venueMessage.conversationId,
		body: venueMessage.body,
	});
	console.log('Conversation:', conversation);

	const rows = await projectVenueRepliesForUser(conversation.standardUserId);
	console.log(`\nprojectVenueRepliesForUser(${conversation.standardUserId}) → ${rows.length} row(s):`);
	for (const r of rows) {
		console.log({
			id: r.id,
			messageId: r.messageId,
			sender: r.sender,
			senderName: r.senderName,
			subject: r.subject,
			bodyPlain: r.bodyPlain,
			campaignId: r.campaignId,
			contactId: r.contactId,
			originalEmailId: r.originalEmailId,
			venueConversationId: r.venueConversationId,
			receivedAt: r.receivedAt,
		});
	}

	// Confirm the specific "yh"-style message is present.
	const matched = rows.find((r) => r.id === -venueMessage.id);
	console.log(
		`\nLatest venue message projected into Responses feed: ${matched ? 'YES ✅' : 'NO ❌'}`
	);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
