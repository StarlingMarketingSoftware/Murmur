// Diagnostic: for a given artist (standard) user, reproduce the campaign inbox
// left-panel (ContactsExpandedList) logic for venue conversations and show whether
// each venue conversation lands in Responses vs Opportunities — and whether it
// passes the campaign-contact sender allowlist at all.
//
// Run: npx tsx scripts/check-venue-inbox-split.ts [userEmail]

import prisma from '@/lib/prisma';
import { convertHtmlToPlainText } from '@/utils';
import { buildInboxConversations } from '@/utils/inboxConversations';
import { projectVenueRepliesForUser } from '@/app/api/_utils/venueInboundProjection';
import type { InboundEmailWithRelations } from '@/types';

// Mirrors ContactsExpandedList.tsx (isInboxOpportunityEmail). Venue DMs are exempt:
// they always belong in Responses, never Opportunities.
const isInboxOpportunityEmail = (email: InboundEmailWithRelations) => {
	if (email.venueConversationId != null) return false;

	const text = `${email.subject || ''} ${email.strippedText || ''} ${email.bodyPlain || ''} ${
		email.bodyHtml ? convertHtmlToPlainText(email.bodyHtml) : ''
	}`.toLowerCase();
	return (
		/\b(pass|passed|declin(?:e|ed|ing)|not interested|not a fit|unavailable|can't|cannot|no longer)\b/.test(
			text
		) ||
		/\b(?:already|fully) booked\b/.test(text) ||
		/\b(booked|confirmed|confirming|reserved)\b/.test(text) ||
		/\b(?:sounds good|let'?s do it|works for us|we'd love|we would love)\b/.test(text) ||
		/\b(in progress|interested|available|tentative|pencil(?:ed)? in|hold(?:ing)? the date|checking|looking into|following up|follow up|send more|details|what dates|which date)\b/.test(
			text
		)
	);
};

async function main() {
	const email = process.argv[2] || 'starlingphotostudio@gmail.com';
	const user = await prisma.user.findFirst({
		where: { email },
		select: { clerkId: true, email: true },
	});
	if (!user) {
		console.log(`No user found for ${email}`);
		return;
	}
	console.log(`User: ${user.email} (clerkId=${user.clerkId})`);

	// Campaign-contact email allowlist (mirrors campaignContactEmails / the left
	// panel's contactsByEmail). A campaign's contacts can be linked directly,
	// through user contact lists, or via legacy contactLists — mirror the exact OR
	// from /api/campaigns/[id]/contacts (the direct `Campaign.contacts` relation
	// alone is empty in practice).
	const campaignRows = await prisma.campaign.findMany({
		where: { userId: user.clerkId },
		select: { id: true, name: true },
	});
	const campaigns = await Promise.all(
		campaignRows.map(async (c) => ({
			...c,
			contacts: await prisma.contact.findMany({
				where: {
					OR: [
						{ campaigns: { some: { id: c.id } } },
						{ userContactLists: { some: { campaigns: { some: { id: c.id } } } } },
						{ contactList: { campaigns: { some: { id: c.id } } } },
					],
				},
				select: { id: true, email: true, venueId: true },
			}),
		}))
	);
	const allowedSenders = new Set<string>();
	for (const c of campaigns) {
		for (const contact of c.contacts) {
			const key = contact.email?.toLowerCase().trim();
			if (key) allowedSenders.add(key);
		}
	}
	console.log(
		`\nCampaigns: ${campaigns.length}; campaign contacts with email (allowlist size): ${allowedSenders.size}`
	);
	for (const c of campaigns) {
		const venueContacts = c.contacts.filter((ct) => ct.venueId != null);
		if (venueContacts.length) {
			console.log(
				`  • Campaign "${c.name}" (#${c.id}) venue contacts:`,
				venueContacts.map((v) => ({ id: v.id, email: v.email, venueId: v.venueId }))
			);
		}
	}

	const rows = await projectVenueRepliesForUser(user.clerkId);
	console.log(`\nprojectVenueRepliesForUser → ${rows.length} venue reply row(s).`);

	// Group venue rows into conversations the way the left panel does.
	const conversations = buildInboxConversations(rows as any).filter(
		(conv) => conv.inboundMessages.length > 0
	);
	console.log(`Venue conversations (inbound>0): ${conversations.length}\n`);

	for (const conv of conversations) {
		const sample = conv.latestInboundMessage ?? conv.latestMessage;
		const sender = sample.sender?.toLowerCase().trim() ?? '';
		const passesAllowlist = allowedSenders.has(sender);
		const isOpportunity = conv.inboundMessages.some(isInboxOpportunityEmail);
		const oppMsgs = conv.inboundMessages
			.filter(isInboxOpportunityEmail)
			.map((m) => (m.bodyPlain || m.strippedText || '').slice(0, 60));

		console.log(`Conversation key: ${conv.key}`);
		console.log(`  sender: ${sender}`);
		console.log(`  passes campaign-contact allowlist?  ${passesAllowlist ? 'YES ✅' : 'NO ❌ (would be hidden from BOTH panels)'}`);
		console.log(`  inbound messages: ${conv.inboundMessages.map((m) => JSON.stringify((m.bodyPlain || '').slice(0, 40)))}`);
		console.log(`  classified as OPPORTUNITY? ${isOpportunity ? `YES (matched: ${JSON.stringify(oppMsgs)})` : 'no'}`);
		const tab = !passesAllowlist
			? 'HIDDEN (sender not in allowlist)'
			: isOpportunity
				? 'Opportunities (EXCLUDED from Responses)'
				: 'Responses';
		console.log(`  → Left panel ContactsExpandedList tab: ${tab}\n`);
	}
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
