import Link from 'next/link';
import { urls } from '@/constants/urls';

export const metadata = { title: 'Privacy Policy | Murmur' };

export default function PrivacyPolicyPage() {
	return (
		<>
			<h1>Privacy Policy</h1>
			<p className="legal-updated">Last updated: June 10, 2026</p>

			<p>
				This Privacy Policy describes how Murmur Technologies (&ldquo;Murmur,&rdquo;
				&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, and
				shares personal information in connection with the Murmur platform, including
				our websites, applications, and the email infrastructure we operate
				(collectively, the &ldquo;Service&rdquo;).
			</p>

			<h2>1. Who This Policy Covers</h2>
			<p>This policy is written for three groups of people:</p>
			<ul>
				<li>
					<strong>Account holders</strong> — artists, musicians, businesses, and
					venues who create Murmur accounts.
				</li>
				<li>
					<strong>Professionals in our contact database</strong> — people whose
					business contact information appears in Murmur&rsquo;s curated database even
					though they do not have a Murmur account.
				</li>
				<li>
					<strong>Email recipients and correspondents</strong> — people who receive
					emails sent by Murmur users, reply to those emails, or exchange messages
					with Murmur users through the Service.
				</li>
			</ul>
			<p>
				If you received an email from a Murmur-operated address (such as one ending in
				@murmurmailbox.com), it was sent by a Murmur user, not by Murmur itself. See
				Sections 4 and 14 for your choices.
			</p>

			<h2>2. Information We Collect — Account Holders</h2>
			<ul>
				<li>
					<strong>Account information:</strong> your name, email address, reply-to
					email address, and the Murmur-assigned sending address for your account.
					Sign-in is handled by our authentication provider; Murmur does not store
					your password.
				</li>
				<li>
					<strong>Billing information:</strong> your customer and subscription
					identifiers with our payment processor, your plan, credit balances, and
					promotional-code usage. Payment card details are collected and stored by our
					payment processor, not by Murmur.
				</li>
				<li>
					<strong>Content:</strong> your campaign prompts and drafts, sent emails,
					inbound replies (including the message body, headers, and attachment
					information) shown in your in-app inbox, marketplace messages, notes, and
					media you upload (such as profile videos, audio, and images).
				</li>
				<li>
					<strong>Usage and technical information:</strong> log and security data
					needed to operate the Service, such as IP addresses, request metadata, and
					rate-limit counters. We do not use analytics or advertising trackers.
				</li>
			</ul>

			<h2>3. Information We Collect — Professionals in Our Contact Database</h2>
			<p>
				If your information appears in our contact database, we may hold the following
				about you: your name, business email address, job title, company and company
				details, business location, LinkedIn profile URL, and a publicly available
				photo URL. This is business and professional contact information, not a
				consumer profile.
			</p>
			<ul>
				<li>
					<strong>Source:</strong> this information is licensed from third-party
					business-data providers and enrichment services, and email validity is
					checked through an email-verification service.
				</li>
				<li>
					<strong>Purpose:</strong> enabling Murmur users to identify and contact
					relevant professional contacts for business outreach. Murmur does not use
					this information for its own marketing.
				</li>
				<li>
					<strong>Your choices:</strong> you may request removal from the database and
					suppression from future emails — see Section 14.
				</li>
			</ul>

			<h2>4. Information We Collect — Email Recipients and Correspondents</h2>
			<ul>
				<li>
					If you receive an email sent through the Service, we process your email
					address and delivery information (such as bounce status). If you
					unsubscribe, we keep a suppression record — your email address, the sender
					it applies to, and how you opted out — so the opt-out keeps being honored.
				</li>
				<li>
					If you reply to an email sent through the Service, your reply (including the
					message body, headers, and attachment information) is stored and shown to
					the user who emailed you in their in-app inbox.
				</li>
				<li>
					We do not embed open-tracking pixels or advertising trackers in emails sent
					through the Service.
				</li>
				<li>
					If you exchange messages with a Murmur user through the venue and artist
					marketplace, those messages are stored and delivered by the Service.
				</li>
			</ul>

			<h2>5. Where Information Comes From</h2>
			<ul>
				<li>
					Directly from you — when you register, create content, upload media, send
					messages, or reply to an email.
				</li>
				<li>
					From third-party data providers — for contact-database records and email
					verification.
				</li>
				<li>
					From service providers acting on our behalf — for example, sign-in events
					from our authentication provider and billing events from our payment
					processor.
				</li>
				<li>
					Automatically, only as needed to operate the Service — logs, security, and
					rate limiting. We do not collect behavioral analytics.
				</li>
			</ul>

			<h2>6. How We Use Information</h2>
			<p>We use personal information to:</p>
			<ul>
				<li>
					Provide and operate the Service — campaigns, contact search, email sending,
					the in-app inbox, and the marketplace.
				</li>
				<li>Generate AI-assisted email drafts at a user&rsquo;s request.</li>
				<li>Verify the validity of recipient email addresses.</li>
				<li>Bill and manage subscriptions and credits.</li>
				<li>
					Enforce our anti-spam rules, suppression lists, and rate limits, and keep
					the Service secure and free of abuse.
				</li>
				<li>Send service and transactional communications.</li>
				<li>Comply with legal obligations, including honoring opt-out requests.</li>
			</ul>
			<p>
				Where the law requires a legal basis, we rely on performance of our contract
				with account holders, our legitimate interests (such as operating the contact
				database, preventing abuse, and defending claims), consent where required, and
				compliance with legal obligations. We do not profile anyone for advertising,
				and we do not use customer content to train our own models.
			</p>

			<h2>7. AI Processing</h2>
			<p>
				When a user generates an email draft, the Service sends the campaign prompt,
				selected contact details (such as the recipient&rsquo;s name, title, and
				company), and the user&rsquo;s profile information to third-party AI providers
				— currently OpenAI, Google (Gemini), Mistral, Perplexity, and OpenRouter — to
				produce the draft. Drafts are returned to the user for review and editing
				before any email is sent. The user is responsible for the final content of
				every message they send.
			</p>

			<h2>8. How We Share Information</h2>
			<p>
				<strong>Service providers.</strong> We share information with providers that
				process it on our behalf to run the Service: hosting and infrastructure
				(Vercel), database hosting (Neon), search (Elasticsearch), email delivery
				(Mailgun), payments (Stripe), authentication (Clerk), AI generation (OpenAI,
				Google, Mistral, Perplexity, OpenRouter), email verification (ZeroBounce),
				media storage (Cloudflare R2), rate limiting (Upstash), webhook delivery
				(Svix), and maps (Mapbox, Google Maps).
			</p>
			<p>
				<strong>At users&rsquo; direction.</strong> When a user sends a campaign, the
				recipient receives the user&rsquo;s identity and message. Venue and artist
				profiles and uploaded media are visible to other users of the marketplace.
			</p>
			<p>
				<strong>Legal and safety.</strong> We may disclose information to comply with
				law, enforce our terms, prevent fraud or abuse, or protect the rights and
				safety of Murmur, our users, or others.
			</p>
			<p>
				<strong>Business transfers.</strong> If Murmur is involved in a merger,
				acquisition, or sale of assets, information may be transferred as part of that
				transaction, subject to the commitments in this policy.
			</p>
			<p>We do not share personal information with third parties in any other way.</p>

			<h2>9. No Sale of Personal Information; No Advertising</h2>
			<p>
				We do not sell personal information, and we do not share it for cross-context
				behavioral advertising. There is no advertising on the Service.
			</p>

			<h2>10. Cookies</h2>
			<ul>
				<li>
					We use essential cookies only — session and authentication cookies set by
					our sign-in provider that are required for the Service to work.
				</li>
				<li>
					Map features load content from Mapbox and Google Maps, which may set their
					own cookies or collect device information under their own privacy policies.
				</li>
				<li>
					We do not use analytics cookies or advertising cookies, and we do not place
					tracking pixels in emails.
				</li>
				<li>
					You can control cookies through your browser settings; blocking essential
					cookies will prevent sign-in.
				</li>
			</ul>

			<h2>11. Data Retention</h2>
			<ul>
				<li>
					Account information and content are retained while your account is active
					and deleted or de-identified within a reasonable period after account
					deletion, subject to legal holds and routine backup cycles.
				</li>
				<li>
					<strong>
						Unsubscribe and suppression records are retained even after an account is
						deleted,
					</strong>{' '}
					because keeping them is necessary to continue honoring opt-out requests.
				</li>
				<li>
					Inbound replies and marketplace messages are retained as part of the
					account&rsquo;s inbox until the account is deleted.
				</li>
				<li>
					Contact-database records about non-users are retained while licensed and
					useful, are refreshed and corrected over time, and are removed upon verified
					removal requests.
				</li>
				<li>Billing records are retained as required for tax and accounting.</li>
			</ul>

			<h2>12. Security</h2>
			<p>
				We protect personal information with measures appropriate to its sensitivity,
				including encryption in transit, delegated authentication (we do not store
				passwords), payment handling by a PCI-DSS-compliant processor, access controls,
				signed tokens for unsubscribe links, and rate limiting and abuse monitoring. No
				method of transmission or storage is completely secure, so we cannot guarantee
				absolute security; please protect your account credentials. If a breach occurs,
				we will notify affected people as required by applicable law.
			</p>

			<h2>13. Your Rights and Choices — Account Holders</h2>
			<ul>
				<li>
					You may request access to, correction of, or deletion of your personal
					information; a copy of your data in a portable format; or restriction of or
					objection to certain processing. We will not discriminate against you for
					exercising these rights.
				</li>
				<li>
					You can manage much of your information in your account settings. Account
					deletion is available through an email-code verification flow or by request
					through the website, and deletion requests are honored — with the exception
					of suppression records described in Section 11.
				</li>
				<li>
					We send service and transactional messages as part of operating the Service;
					any marketing messages from Murmur include an opt-out.
				</li>
				<li>
					We verify your identity before fulfilling requests (for example, through an
					email verification code).
				</li>
			</ul>

			<h2>14. Your Rights and Choices — Non-Users</h2>
			<p>
				<strong>If you received an email sent through Murmur:</strong> every outreach
				email includes a one-click unsubscribe option and an unsubscribe page. Using
				either adds you to a suppression list so that the sender cannot email you again
				through Murmur. Suppression is enforced automatically and persists
				indefinitely. If you want broader suppression or removal, contact us through
				the website.
			</p>
			<p>
				<strong>If your information is in our contact database:</strong> you may
				request to know what business contact information we hold about you, request
				that it be corrected, or request removal from the database. Verified requests
				are honored, and removal prevents your record from appearing in future
				searches. To submit a request, contact us through the website; we may verify
				that you control the email address in question.
			</p>

			<h2>15. Children</h2>
			<p>
				The Service is not directed to anyone under 18, and we do not knowingly collect
				personal information from minors. If we learn that we have, we will delete it.
				If you believe a minor has provided us information, contact us through the
				website.
			</p>

			<h2>16. International Users</h2>
			<p>
				Murmur Technologies is based in, and processes data in, the United States. If
				you use the Service or your information is processed by it from outside the
				United States — including from the European Economic Area or the United Kingdom
				— your information will be transferred to and processed in the United States,
				where laws may differ from those in your jurisdiction. Where the law requires,
				we take appropriate safeguards for such transfers.
			</p>

			<h2>17. Changes to This Policy</h2>
			<p>
				We may update this policy from time to time. We will post the updated version
				with a new &ldquo;Last updated&rdquo; date, and we will provide notice of
				material changes through the Service or by email.
			</p>

			<h2>18. Contact Us</h2>
			<p>
				To ask questions about this policy or exercise any of the rights described in
				it, contact us through the website. See also our{' '}
				<Link href={urls.terms.index}>Terms of Service</Link>.
			</p>
		</>
	);
}
