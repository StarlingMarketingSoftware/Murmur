/**
 * Branded "You have 1 new message" template for cold outbound campaign emails
 * (LinkedIn-promo-style notification, per Figma).
 *
 * Server-only, zero dependencies. The rendered document is sent to Mailgun AS-IS —
 * it must never be passed through formatHTMLForEmailClients (which strips <p> tags
 * and re-wraps content). Only the user's drafted message is pre-processed by that
 * formatter before being embedded here.
 *
 * Icon/logo assets live in public/email/ (regenerate with
 * scripts/generate-email-logo.ts and scripts/generate-email-icons.ts).
 */

export interface NewMessageEmailInput {
	/** Artist display name shown in the green card header ("Musician" label below). */
	artistName: string;
	/** User's drafted subject. Empty/whitespace → subject box omitted, body box grows. */
	draftSubject: string;
	/**
	 * User's drafted message — RAW HTML, must already be the output of
	 * formatHTMLForEmailClients. Its wrapper div's Arial/black styling is rewritten
	 * to the template's Inter/#1F1F1F here.
	 */
	messageHtml: string;
	/** Profile pills — each rendered only when non-empty. */
	genre?: string | null;
	bandName?: string | null;
	area?: string | null;
	bio?: string | null;
	/** Public video share URL; null/undefined → Play Video pill omitted. */
	videoShareUrl?: string | null;
	/** "View messages" button target (venue landing page). */
	viewMessagesUrl: string;
	/** Unsubscribe page URL (footer link). */
	unsubscribeUrl: string;
	/** Absolute site origin hosting the email assets under /email/ (logo + icons). */
	assetBaseUrl: string;
}

const FONT_STACK =
	"Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const TEXT_COLOR = '#1F1F1F';

const escapeHtml = (text: string): string =>
	text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

/** Only http(s) URLs are interpolated into href/src attributes; anything else → '#'. */
const safeUrl = (url: string): string =>
	/^https?:\/\//i.test(url.trim()) ? escapeHtml(url.trim()) : '#';

const hasText = (value?: string | null): value is string => !!value?.trim();

const truncate = (text: string, max: number): string =>
	text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

// Email clients don't reliably support max-height/overflow, so the message box is
// capped by truncating pathologically long drafts server-side instead (the
// plain-text alternative still carries the full message).
const MAX_MESSAGE_CHARS = 2000;
const MAX_MESSAGE_LINES = 32;

/** Plain text of the formatter's output (tags + basic entities only). */
const messageHtmlToText = (html: string): string =>
	html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/div>\s*<div[^>]*>/gi, '\n')
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/gi, '&')
		.trim();

/** Returns the message HTML unchanged unless it exceeds the size caps. */
const capMessageHtml = (messageHtml: string): string => {
	const text = messageHtmlToText(messageHtml);
	const lines = text.split('\n');
	if (text.length <= MAX_MESSAGE_CHARS && lines.length <= MAX_MESSAGE_LINES) {
		return messageHtml;
	}
	const capped = truncate(
		lines.slice(0, MAX_MESSAGE_LINES).join('\n').trimEnd(),
		MAX_MESSAGE_CHARS
	);
	const cappedWithEllipsis = capped.endsWith('…') ? capped : `${capped}…`;
	return `<div>${escapeHtml(cappedWithEllipsis).replace(/\n/g, '<br>')}</div>`;
};

/** Mirrors getProfileGenreIcon (profileFieldIcons.tsx): label → committed PNG slug. */
const GENRE_ICON_SLUGS: Record<string, string> = {
	pop: 'genre-pop',
	rock: 'genre-rock',
	country: 'genre-country',
	jazz: 'genre-jazz',
	electronic: 'genre-electronic',
	classical: 'genre-classical',
	'hip-hop': 'genre-hip-hop',
	gospel: 'genre-gospel',
	'r&b': 'genre-r-and-b',
	folk: 'genre-folk',
};

/**
 * Rewrite the message wrapper's email-client baseline (Arial/black, set by
 * formatHTMLForEmailClients) to this template's typography. The body box supplies
 * font-size/line-height, so those are dropped from the wrapper if present.
 */
const restyleMessageHtml = (messageHtml: string): string => {
	const trimmed = messageHtml.trim();
	const wrapperMatch = trimmed.match(/^<div\b[^>]*>/i);
	if (!wrapperMatch) {
		return `<div style="font-family: ${FONT_STACK}; color: ${TEXT_COLOR};">${trimmed}</div>`;
	}

	const tag = wrapperMatch[0];
	const styleMatch = tag.match(/\sstyle=("([^"]*)"|'([^']*)')/i);
	const declarations: Record<string, string> = {};
	(styleMatch?.[2] ?? styleMatch?.[3] ?? '')
		.split(';')
		.map((decl) => decl.trim())
		.filter(Boolean)
		.forEach((decl) => {
			const idx = decl.indexOf(':');
			if (idx === -1) return;
			declarations[decl.slice(0, idx).trim().toLowerCase()] = decl.slice(idx + 1).trim();
		});
	declarations['font-family'] = FONT_STACK;
	declarations['color'] = TEXT_COLOR;
	delete declarations['font-size'];
	delete declarations['line-height'];

	const style = Object.entries(declarations)
		.map(([prop, value]) => `${prop}: ${value}`)
		.join('; ');
	const updatedTag = styleMatch
		? tag.replace(styleMatch[0], ` style="${style};"`)
		: tag.replace(/^<div/i, `<div style="${style};"`);
	return trimmed.replace(wrapperMatch[0], updatedTag);
};

const PILL_TEXT_STYLE = `font-family: ${FONT_STACK}; font-size: 12px; line-height: 15px; color: ${TEXT_COLOR};`;

export const renderNewMessageEmailHtml = (input: NewMessageEmailInput): string => {
	const artistName = escapeHtml(input.artistName.trim());
	const draftSubject = escapeHtml(truncate(input.draftSubject.trim(), 70));
	const hasSubject = draftSubject !== '';
	const messageHtml = restyleMessageHtml(capMessageHtml(input.messageHtml));
	const viewMessagesUrl = safeUrl(input.viewMessagesUrl);
	const unsubscribeUrl = safeUrl(input.unsubscribeUrl);
	const assetBase = safeUrl(input.assetBaseUrl).replace(/\/$/, '');
	const replyHint = escapeHtml(
		input.viewMessagesUrl.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '')
	);

	const icon = (slug: string, width: number, height: number): string =>
		`<img src="${assetBase}/email/icons/${slug}.png" width="${width}" height="${height}" alt="" style="vertical-align: middle; border: 0;" />`;

	// 70%-scaled from the Figma spec: 494px body box (548px without the subject box)
	// minus padding/borders; height acts as min-height in email clients.
	const bodyMinHeight = hasSubject ? 318 : 356;

	const subjectBox = hasSubject
		? `
								<tr>
									<td style="padding: 6px 6px 0;">
										<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="width: 100%; background-color: #FFFFFF; border: 2px solid #000000; border-radius: 6px; border-collapse: separate;">
											<tr>
												<td valign="middle" style="height: 29px; padding: 0 10px; font-family: ${FONT_STACK}; font-size: 12px; font-weight: 700; line-height: 15px; color: ${TEXT_COLOR};">${draftSubject}</td>
											</tr>
										</table>
									</td>
								</tr>`
		: '';

	const pill = (iconHtml: string, text: string): string => `
							<table role="presentation" align="left" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 31px;">
								<tr>
									<td bgcolor="#FFFFFF" style="background-color: #FFFFFF; border-radius: 17px; padding: 8px 13px; ${PILL_TEXT_STYLE} white-space: nowrap;">${iconHtml}${iconHtml ? '&nbsp; ' : ''}<span style="vertical-align: middle;">${escapeHtml(text)}</span></td>
								</tr>
							</table>
							<br clear="all" />`;

	const genreSlug = hasText(input.genre)
		? GENRE_ICON_SLUGS[input.genre.trim().toLowerCase()]
		: undefined;

	const pills = [
		hasText(input.genre)
			? pill(genreSlug ? icon(genreSlug, 13, 13) : '', input.genre.trim())
			: '',
		hasText(input.bandName)
			? pill(icon('performing-name', 14, 14), input.bandName.trim())
			: '',
		hasText(input.area) ? pill(icon('area-marker', 12, 15), input.area.trim()) : '',
		hasText(input.bio)
			? `
							<table role="presentation" align="left" width="175" cellpadding="0" cellspacing="0" border="0" style="width: 175px; margin: 0 0 31px;">
								<tr>
									<td bgcolor="#FFFFFF" style="background-color: #FFFFFF; border-radius: 8px; padding: 10px 11px; font-family: ${FONT_STACK}; font-size: 11px; line-height: 15px; color: ${TEXT_COLOR};">${icon('bio', 8, 17)}&nbsp; ${escapeHtml(truncate(input.bio.trim(), 220))}</td>
								</tr>
							</table>
							<br clear="all" />`
			: '',
		hasText(input.videoShareUrl)
			? `
							<table role="presentation" align="left" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 31px;">
								<tr>
									<td bgcolor="#FFFFFF" style="background-color: #FFFFFF; border-radius: 17px;">
										<a href="${safeUrl(input.videoShareUrl)}" target="_blank" style="display: block; padding: 8px 13px; ${PILL_TEXT_STYLE} text-decoration: none; white-space: nowrap;">${icon('play', 12, 12)}&nbsp; <span style="vertical-align: middle;">Play Video</span></a>
									</td>
								</tr>
							</table>
							<br clear="all" />`
			: '',
	].join('');

	return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta name="x-apple-disable-message-reformatting" />
	<meta name="color-scheme" content="light" />
	<meta name="supported-color-schemes" content="light" />
	<title>You have 1 new message</title>
	<!--[if mso]>
	<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
	<![endif]-->
	<style type="text/css">
		body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
		table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
		img { -ms-interpolation-mode: bicubic; }
		/* The 817px canvas cannot fit below ~840px: hide the side gutters, go fluid. */
		@media only screen and (max-width: 839px) {
			.gutter-left, .pill-rail { display: none !important; width: 0 !important; }
			.canvas { width: 100% !important; max-width: 480px !important; }
			.main-col { width: 100% !important; }
		}
		@media only screen and (max-width: 520px) {
			.px-outer { padding-left: 12px !important; padding-right: 12px !important; }
			.heading { font-size: 17px !important; line-height: 22px !important; }
		}
	</style>
</head>
<body style="margin: 0; padding: 0; word-spacing: normal; background-color: #F2F0ED;" bgcolor="#F2F0ED">

	<!-- Hidden preheader (inbox preview line) -->
	<div style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all;">${artistName} sent you a message on Murmur&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F2F0ED" style="background-color: #F2F0ED;">
		<tr>
			<td align="center" style="padding: 0;">

				<!-- Canvas: equal gray gutters so the white column is centered; the white
				     column runs the full height of the email (no outer vertical padding). -->
				<table role="presentation" class="canvas" width="817" cellpadding="0" cellspacing="0" border="0" style="width: 817px;">
					<tr>
						<td class="gutter-left" width="187" style="width: 187px; font-size: 0; line-height: 0;">&nbsp;</td>

						<!-- White column -->
						<td class="main-col" width="443" valign="top" bgcolor="#FFFFFF" style="width: 443px; background-color: #FFFFFF;">
							<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
								<tr>
									<td class="px-outer" align="left" style="padding: 28px 28px 0;">
										<img src="${assetBase}/email/murmur-logo.png" width="98" height="17" alt="murmur" style="display: block; width: 98px; height: 17px; border: 0; outline: none;" />
									</td>
								</tr>
								<tr>
									<td class="heading px-outer" align="center" style="padding: 20px 17px; font-family: ${FONT_STACK}; font-size: 20px; line-height: 25px; font-weight: 400; color: ${TEXT_COLOR};">You have <strong style="font-weight: 700;">1 new message</strong></td>
								</tr>

								<!-- Green message card -->
								<tr>
									<td align="center" class="px-outer" style="padding: 0 13px;">
										<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#85D790" style="width: 100%; max-width: 416px; background-color: #85D790; border: 2px solid #000000; border-radius: 8px; border-collapse: separate;">
											<tr>
												<td valign="middle" style="padding: 6px 11px; height: 27px; border-bottom: 2px solid #000000;">
													<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
														<tr>
															<td align="left" style="font-family: ${FONT_STACK};">
																<div style="font-size: 14px; font-weight: 700; line-height: 17px; color: #000000;">${artistName}</div>
																<div style="font-size: 9px; line-height: 11px; color: #000000;">Musician</div>
															</td>
															<td align="right" valign="top" aria-hidden="true" style="font-family: ${FONT_STACK}; font-size: 13px; font-weight: 700; color: #000000;">&#8212;</td>
														</tr>
													</table>
												</td>
											</tr>${subjectBox}
											<tr>
												<td style="padding: 6px 6px 8px;">
													<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="width: 100%; background-color: #FFFFFF; border: 2px solid #000000; border-radius: 6px; border-collapse: separate;">
														<tr>
															<td valign="top" style="padding: 13px; height: ${bodyMinHeight}px; font-family: ${FONT_STACK}; font-size: 12px; line-height: 18px; color: ${TEXT_COLOR};">${messageHtml}</td>
														</tr>
													</table>
												</td>
											</tr>
										</table>
									</td>
								</tr>

								<!-- View messages button -->
								<tr>
									<td align="center" class="px-outer" style="padding: 17px 31px 0;">
										<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 382px;">
											<tr>
												<td align="center" bgcolor="#0A66C2" style="background-color: #0A66C2; border-radius: 20px;">
													<a href="${viewMessagesUrl}" target="_blank" style="display: block; padding: 12px 7px; font-family: ${FONT_STACK}; font-size: 13px; font-weight: 700; line-height: 16px; color: #FFFFFF; text-decoration: none;">View messages</a>
												</td>
											</tr>
										</table>
									</td>
								</tr>

								<tr>
									<td align="center" style="padding: 11px 17px 0; font-family: ${FONT_STACK}; font-size: 12px; line-height: 16px; color: ${TEXT_COLOR};">Reply here in email or at <a href="${viewMessagesUrl}" target="_blank" style="color: ${TEXT_COLOR}; text-decoration: underline;">${replyHint}</a></td>
								</tr>

								<tr>
									<td align="center" style="padding: 20px 17px 22px;">
										<a href="${unsubscribeUrl}" target="_blank" style="font-family: ${FONT_STACK}; font-size: 10px; color: #6B6B6B; text-decoration: underline;">Unsubscribe</a>
									</td>
								</tr>
							</table>
						</td>

						<!-- Pill rail (gray page bg shows through; aligns with the card top) -->
						<td class="pill-rail" width="187" valign="top" style="width: 187px; padding: 110px 0 0 12px;">${pills}</td>
					</tr>
				</table>

			</td>
		</tr>
	</table>
</body>
</html>`;
};

export const renderNewMessageEmailText = (input: {
	draftSubject: string;
	/** Plain text of the user's drafted message (convertHtmlToPlainText output). */
	messageText: string;
	/** bandName when set, otherwise the artist's name. */
	displayName: string;
	viewMessagesUrl: string;
	unsubscribeUrl: string;
}): string => {
	const subjectLine = input.draftSubject.trim()
		? `${input.draftSubject.trim()}\n\n`
		: '';
	return `You have 1 new message on Murmur

${input.displayName.trim()} sent you a message:

${subjectLine}${input.messageText.trim()}

View and reply: ${input.viewMessagesUrl}

---
Unsubscribe: ${input.unsubscribeUrl}
`;
};
