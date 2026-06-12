import Link from 'next/link';
import { urls } from '@/constants/urls';

export const metadata = { title: 'Terms of Service | Murmur' };

export default function TermsOfServicePage() {
	return (
		<>
			<h1>Terms of Service</h1>
			<p className="legal-updated">Last updated: June 11, 2026</p>

			<p>
				These Terms of Service (the &ldquo;Terms&rdquo;) are a binding agreement
				between you and Murmur Technologies (&ldquo;Murmur,&rdquo; &ldquo;we,&rdquo;
				&ldquo;us,&rdquo; or &ldquo;our&rdquo;), the operator of the Murmur platform,
				including our websites, applications, and the email infrastructure we provide
				(collectively, the &ldquo;Service&rdquo;). By creating an account or using the
				Service, you agree to these Terms and to our{' '}
				<Link href={urls.privacy.index}>Privacy Policy</Link>, which is incorporated
				into these Terms by reference. If you do not agree, do not use the Service.
			</p>

			<h2>1. Acceptance of Terms</h2>
			<p>
				You accept these Terms by creating an account, clicking to agree, or using the
				Service. If you use the Service on behalf of a company, band, venue, or other
				organization, you represent that you have authority to bind that organization,
				and &ldquo;you&rdquo; includes both you and that organization.
			</p>

			<h2>2. Eligibility and Business Use</h2>
			<ul>
				<li>You must be at least 18 years old to use the Service.</li>
				<li>
					The Service is intended for business and professional outreach — for example,
					by musicians, artists, venues, and businesses. It is not intended for
					personal or consumer messaging, and it may not be used as a general-purpose
					mailbox.
				</li>
				<li>
					You must provide accurate registration information, including your name,
					email address, and any reply-to address, and keep it up to date.
				</li>
			</ul>

			<h2>3. Accounts and Security</h2>
			<ul>
				<li>
					Sign-in is provided through a third-party identity provider. Murmur does not
					store your password.
				</li>
				<li>
					You are responsible for safeguarding access to your account and for all
					activity that occurs under it, including all emails sent from your account.
				</li>
				<li>
					Murmur assigns your account a sending address on a Murmur-operated domain
					(such as an address ending in @murmurmailbox.com). That address belongs to
					Murmur and is licensed to you for use only within the Service. It is not
					portable and may be reclaimed when your account closes.
				</li>
				<li>
					Notify us through the website promptly if you suspect unauthorized use of
					your account.
				</li>
			</ul>

			<h2>4. The Service</h2>
			<p>
				The Service lets you build email campaigns, search a curated database of
				professional contacts, generate email drafts with the assistance of artificial
				intelligence, send emails through Murmur&rsquo;s infrastructure, receive and
				manage replies in an in-app inbox, and — for venues and artists — post events,
				apply to events, and message one another. We may add, modify, or discontinue
				features at any time. Where a change materially reduces paid functionality, we
				will act reasonably, including by providing notice where practicable. Features
				identified as beta or experimental are provided as-is and may change or be
				withdrawn at any time.
			</p>

			<h2>5. Subscriptions, Free Trial, and Billing</h2>
			<ul>
				<li>
					Paid plans are billed through our payment processor. Murmur does not collect
					or store full payment card details.
				</li>
				<li>
					If a free trial is offered, your trial converts automatically to a paid
					subscription at the end of the trial period unless you cancel before the
					trial ends. A payment method may be required to start a trial. It is your
					responsibility to cancel before the trial ends if you do not wish to be
					charged; charges resulting from a trial converting to a paid subscription
					are not refundable (see Section 7).
				</li>
				<li>
					Subscriptions renew automatically at the end of each billing period
					(monthly or annual) until cancelled. You may cancel at any time through your
					account; cancellation takes effect at the end of the current billing period,
					and no partial-period refunds are provided.
				</li>
				<li>
					Promotional codes are one-time, non-transferable, have no cash value, and
					may be revoked in cases of abuse.
				</li>
				<li>
					We may change prices with notice before your next renewal. Continued use
					after the renewal takes effect constitutes acceptance of the new price.
				</li>
				<li>You are responsible for any applicable taxes.</li>
			</ul>

			<h2>6. Credits</h2>
			<ul>
				<li>
					Certain actions on the Service consume credits — for example, drafting
					credits, sending credits, verification credits, and AI credits. The
					applicable action consumes the corresponding credit type.
				</li>
				<li>
					Credit balances refresh to your plan&rsquo;s allotment each billing month.
					Unused credits do not roll over or accumulate.
				</li>
				<li>
					Credits have no cash value, are non-transferable and non-refundable, and are
					forfeited when your subscription ends or your account is terminated.
				</li>
				<li>
					We may adjust credit allotments or the credit cost of actions prospectively,
					with notice of material changes.
				</li>
			</ul>

			<h2>7. Refunds</h2>
			<p>
				Except where required by applicable law, all fees are non-refundable, including
				for partial billing periods and unused credits. The free trial is the intended
				way to evaluate the Service before paying. In particular, charges that result
				from a free trial converting to a paid subscription, or from your failure to
				cancel a trial or subscription before it renews — including where you forgot to
				cancel, did not use the Service, or did not intend to continue — are not
				eligible for a refund under any circumstances. We may, at our sole discretion,
				issue refunds or credits for billing errors on our part without waiving this
				policy. Payment disputes or chargebacks filed in bad faith may result in
				suspension of your account.
			</p>

			<h2>8. Acceptable Use and Anti-Spam Policy</h2>
			<p>
				This section is the core of these Terms. The Service sends real email to real
				people on shared infrastructure, and misuse by one user harms every user.
			</p>
			<p>
				<strong>You are the sender.</strong> You — not Murmur — are the sender of
				record and the &ldquo;initiator&rdquo; of every email sent through the Service
				for purposes of the U.S. CAN-SPAM Act and equivalent laws. You are solely
				responsible for the content of your messages, the selection of your recipients,
				and the legality of your campaigns. You must comply with all laws that apply to
				your messages and your recipients, which may include the CAN-SPAM Act, Canada&rsquo;s
				Anti-Spam Legislation (CASL), the GDPR and ePrivacy rules, and similar laws in
				other jurisdictions.
			</p>
			<p>When sending through the Service, you must:</p>
			<ul>
				<li>
					Use accurate header and identity information. Do not impersonate any person
					or entity, and do not use misleading sender names or reply-to addresses.
				</li>
				<li>Not use deceptive or misleading subject lines.</li>
				<li>
					Never circumvent, disable, or attempt to bypass the unsubscribe mechanisms
					the Service adds to your messages, and never attempt to contact recipients
					who have opted out. The Service automatically includes one-click unsubscribe
					links and enforces a suppression list for your account. If someone asks you
					to stop emailing them outside the platform, you must honor that request too.
				</li>
				<li>
					Include any sender-identification information required by law for your
					messages and your recipients&rsquo; jurisdictions.
				</li>
			</ul>
			<p>You must not use the Service to:</p>
			<ul>
				<li>
					Send unlawful, fraudulent, deceptive, defamatory, harassing, or infringing
					content; phishing or malware; sexually explicit content; content promoting
					illegal goods or services; or content targeting minors.
				</li>
				<li>
					Email addresses obtained by harvesting or scraping, or purchased lists
					imported from outside the Service in violation of applicable law.
				</li>
				<li>
					Interfere with the Service or its infrastructure, including evading rate
					limits, creating accounts by automated means, scraping the contact database
					or the marketplace, probing or testing security, reverse engineering, or
					reselling access to the Service.
				</li>
			</ul>
			<p>
				<strong>Deliverability and complaints.</strong> Sending volume is governed by
				your plan and credits. We may throttle, queue, or decline sends to protect the
				deliverability of our shared sending domains. We monitor bounce rates, spam
				complaints, and suppression activity. Accounts that exceed reasonable
				thresholds, generate complaints from mailbox providers, or put our
				infrastructure or other users at risk may be throttled, suspended, or
				terminated immediately and without refund.
			</p>

			<h2>9. Contact Database License</h2>
			<ul>
				<li>
					Murmur grants you a limited, non-exclusive, non-transferable, revocable
					license to access and use records from our contact database (such as names,
					business email addresses, titles, companies, and locations) solely within
					the Service and solely for your own outreach campaigns.
				</li>
				<li>
					You may not export contact records in bulk, scrape, copy, resell,
					sublicense, or publish them; use them to build or augment any other database
					or product; share them with third parties; or continue to use them after
					your account ends.
				</li>
				<li>
					Contact data is sourced from third-party data providers and public and
					professional sources and is provided as-is, with no guarantee of accuracy,
					currency, deliverability, or fitness for any purpose. Email verification
					reduces, but does not eliminate, invalid addresses.
				</li>
				<li>
					We may add, correct, or remove records at any time, including to honor
					requests from the individuals concerned. We make no commitment that any
					record will remain available.
				</li>
				<li>
					You must use contact data in compliance with applicable data-protection laws
					when contacting individuals.
				</li>
			</ul>

			<h2>10. Email Infrastructure, Message Format, and Replies</h2>
			<ul>
				<li>
					All emails are sent from your assigned Murmur sending address through
					Murmur&rsquo;s email infrastructure. You may not attempt to send through
					other domains via the Service or misrepresent the sending domain.
				</li>
				<li>
					Outreach emails may be delivered in a Murmur-branded format (for example, a
					&ldquo;you have a new message&rdquo; notification wrapper). We may modify
					message formatting and may add headers, footers, identification, or
					unsubscribe links to any message as we consider necessary.
				</li>
				<li>
					Replies sent to your Murmur address are received, stored (including the
					message body, headers, and attachment information), and shown in your in-app
					inbox. You are responsible for your handling of reply content.
				</li>
				<li>
					We do not guarantee delivery, inbox placement, open or reply rates, or any
					business outcome of your campaigns.
				</li>
			</ul>

			<h2>11. AI-Generated Content</h2>
			<ul>
				<li>
					Email drafts are generated using third-party artificial-intelligence
					providers. Your campaign prompts, selected contact details, and your profile
					information are transmitted to those providers to produce drafts, as
					described in our <Link href={urls.privacy.index}>Privacy Policy</Link>.
				</li>
				<li>
					You must review and approve every AI-generated draft before sending. You are
					solely responsible for the final content of every message you send,
					including its accuracy, legality, and compliance with Section 8.
				</li>
				<li>
					AI output may be inaccurate or incomplete and may be similar to output
					generated for others. We make no warranty regarding AI output. As between
					you and Murmur, Murmur assigns to you its interest, if any, in drafts
					generated for you, subject to these Terms.
				</li>
				<li>
					You may not use AI generation to produce content prohibited by these Terms
					or to deceive recipients in a manner prohibited by law.
				</li>
			</ul>

			<h2>12. Your Content and License to Murmur</h2>
			<ul>
				<li>
					&ldquo;Your Content&rdquo; means the content you create or upload on the
					Service, including campaign text and prompts, profile information,
					marketplace messages, and uploaded media such as videos, audio, and images.
				</li>
				<li>You retain ownership of Your Content.</li>
				<li>
					You grant Murmur a worldwide, non-exclusive, royalty-free license to host,
					store, reproduce, process, transmit, and display Your Content as needed to
					operate the Service — for example, to send your emails, generate drafts at
					your request, deliver your messages, and display venue and artist profiles
					and media to other users of the marketplace.
				</li>
				<li>
					You represent that you own or have the necessary rights to all of Your
					Content — including any music, recordings, or video you upload — and that it
					does not infringe any third party&rsquo;s rights.
				</li>
				<li>
					We may remove content that we believe infringes third-party rights or
					violates these Terms, and may terminate the accounts of repeat infringers.
				</li>
			</ul>

			<h2>13. Venue and Artist Marketplace</h2>
			<ul>
				<li>
					Murmur provides the platform only. Murmur is not a party to, broker of, or
					guarantor of any booking, performance agreement, payment, or other
					arrangement between venues and artists.
				</li>
				<li>
					We do not guarantee responses, applications, bookings, the accuracy of
					posted events, or the identity or quality of any user. Users deal with each
					other at their own risk and should put their arrangements in writing
					directly.
				</li>
				<li>
					Messages between venues and artists are stored and delivered by the Service,
					and the rules in Section 8 apply to marketplace messaging.
				</li>
				<li>
					Venues are responsible for the accuracy and legality of their posted events;
					artists are responsible for the accuracy of their applications and media.
				</li>
				<li>
					Disputes between users are between those users. We may, but are not
					obligated to, assist or moderate.
				</li>
			</ul>

			<h2>14. Murmur&rsquo;s Intellectual Property</h2>
			<p>
				Murmur Technologies retains all rights, title, and interest in the Service,
				including its software, design, the contact database as a compilation, the
				Murmur sending addresses and domains, and the Murmur name and branding. You
				receive only the limited rights expressly granted in these Terms. If you give
				us feedback, we may use it without restriction or obligation.
			</p>

			<h2>15. Third-Party Services</h2>
			<p>
				The Service depends on third-party providers — including payment processing,
				authentication, email delivery, AI models, hosting, and maps. Their
				availability and terms are outside our control, and certain features may be
				subject to or affected by those providers&rsquo; terms. We are not responsible
				for third-party services, for websites linked from emails or profiles, or for
				content provided by other users.
			</p>

			<h2>16. Privacy</h2>
			<p>
				Our processing of personal data is described in our{' '}
				<Link href={urls.privacy.index}>Privacy Policy</Link>. You acknowledge that
				recipients and contacts have opt-out rights that the Service enforces
				automatically, and that unsubscribe records persist so those opt-outs keep
				being honored.
			</p>

			<h2>17. Suspension and Termination</h2>
			<ul>
				<li>
					You may cancel your subscription at any time through your account, effective
					at the end of the current billing period, and may request deletion of your
					account.
				</li>
				<li>
					We may suspend or terminate your access immediately if you violate Sections
					8 or 9, if your sending generates complaints or bounce rates that threaten
					deliverability, for non-payment, for unlawful activity, or to protect the
					Service, our infrastructure, or other users. For terminations not based on
					breach, we will provide reasonable notice.
				</li>
				<li>
					Upon termination: your license to the Service and the contact database ends;
					your Murmur sending address is reclaimed and inbound mail to it may cease;
					remaining credits are forfeited; and fees are non-refundable as described in
					Section 7. Your content and account data are deleted in accordance with our
					Privacy Policy — except unsubscribe and suppression records, which are
					retained so that opt-outs continue to be honored.
				</li>
				<li>
					Sections that by their nature should survive termination do survive,
					including Sections 12, 14, and 18 through 23.
				</li>
			</ul>

			<h2>18. Disclaimer of Warranties</h2>
			<p>
				THE SERVICE — INCLUDING THE CONTACT DATABASE, AI OUTPUT, EMAIL DELIVERY, AND
				THE MARKETPLACE — IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
				AVAILABLE.&rdquo; TO THE MAXIMUM EXTENT PERMITTED BY LAW, MURMUR DISCLAIMS ALL
				WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A
				PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WITHOUT LIMITING THE FOREGOING, WE DO
				NOT WARRANT THE ACCURACY OF CONTACT DATA, EMAIL DELIVERABILITY OR INBOX
				PLACEMENT, CAMPAIGN RESULTS OR BUSINESS OUTCOMES, THE QUALITY OF AI OUTPUT, THE
				CONDUCT OF OTHER USERS, OR THAT THE SERVICE WILL BE UNINTERRUPTED OR
				ERROR-FREE. SOME JURISDICTIONS DO NOT ALLOW CERTAIN WARRANTY DISCLAIMERS, SO
				SOME OF THE ABOVE MAY NOT APPLY TO YOU.
			</p>

			<h2>19. Limitation of Liability</h2>
			<p>
				TO THE MAXIMUM EXTENT PERMITTED BY LAW, MURMUR WILL NOT BE LIABLE FOR ANY
				INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, OR FOR LOST
				PROFITS, REVENUE, DATA, OR GOODWILL, ARISING FROM OR RELATED TO THE SERVICE.
				MURMUR&rsquo;S TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING FROM OR RELATED
				TO THE SERVICE IS LIMITED TO THE GREATER OF (A) THE AMOUNTS YOU PAID TO MURMUR
				IN THE TWELVE MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR (B) ONE
				HUNDRED U.S. DOLLARS. WITHOUT LIMITING THE FOREGOING, MURMUR IS NOT LIABLE FOR
				INACCURACIES IN CONTACT DATA, CLAIMS BY RECIPIENTS OR REGULATORS ARISING FROM
				YOUR CAMPAIGNS, AI OUTPUT, THIRD-PARTY PROVIDERS, OR DEALINGS BETWEEN VENUES
				AND ARTISTS. THE PRICING OF THE SERVICE REFLECTS THIS ALLOCATION OF RISK. SOME
				JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS, SO SOME OF THE ABOVE MAY NOT
				APPLY TO YOU.
			</p>

			<h2>20. Indemnification</h2>
			<p>
				You will defend, indemnify, and hold harmless Murmur Technologies and its
				officers, employees, and agents from and against any third-party claims,
				damages, and expenses (including reasonable attorneys&rsquo; fees) arising from
				(a) your campaigns and email content, including claims by recipients or
				regulators under anti-spam, privacy, or defamation laws; (b) Your Content,
				including intellectual-property claims relating to uploaded music or media; (c)
				your breach of these Terms, in particular Sections 8 and 9; or (d) your
				dealings with other users, including bookings between venues and artists. We
				may assume control of the defense at our option, in which case you will
				cooperate; you may not settle any claim that binds Murmur without our consent.
			</p>

			<h2>21. Dispute Resolution</h2>
			<p>
				If you have a dispute with Murmur, contact us through the website first. The
				parties will attempt in good faith to resolve any dispute informally for at
				least 30 days before initiating formal proceedings. These Terms are governed by
				the laws applicable where Murmur Technologies is organized, without regard to
				conflict-of-laws rules. To the extent permitted by law, any claim arising from
				the Service must be brought within one year after it accrues.
			</p>

			<h2>22. Changes to These Terms</h2>
			<p>
				We may update these Terms from time to time. If a change is material, we will
				provide notice through the Service or by email with reasonable advance notice.
				The &ldquo;Last updated&rdquo; date above reflects the current version.
				Continued use of the Service after a change takes effect constitutes acceptance
				of the updated Terms.
			</p>

			<h2>23. General</h2>
			<p>
				If any provision of these Terms is found unenforceable, the remainder stays in
				effect. Our failure to enforce a provision is not a waiver. You may not assign
				these Terms; we may assign them in connection with a merger, acquisition, or
				sale of assets. These Terms and the Privacy Policy are the entire agreement
				between you and Murmur regarding the Service. Nothing in these Terms creates a
				partnership, agency, or employment relationship. We are not liable for delays
				or failures caused by events beyond our reasonable control. You must comply
				with applicable export-control and sanctions laws. You consent to receive
				notices electronically through the Service or at your registered email address.
			</p>

			<h2>24. Contact</h2>
			<p>
				Questions about these Terms? Contact us through the website.
			</p>
		</>
	);
}
