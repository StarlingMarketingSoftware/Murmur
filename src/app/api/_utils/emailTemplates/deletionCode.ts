/**
 * Transactional "account deletion confirmation code" email.
 *
 * Server-only, zero dependencies. The rendered document is sent to Mailgun AS-IS —
 * it must never be passed through formatHTMLForEmailClients (which strips <p> tags
 * and re-wraps content).
 */

export interface DeletionCodeEmailInput {
	/** 6 digits, server-generated (never user-controlled). */
	code: string;
	expiresMinutes: number;
}

const FONT_STACK =
	"Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const renderDeletionCodeEmailHtml = ({
	code,
	expiresMinutes,
}: DeletionCodeEmailInput): string => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Your Murmur confirmation code</title>
</head>
<body style="margin:0; padding:0; background-color:#F2F2F2;">
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">Your Murmur confirmation code: ${code}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F2F2F2;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background-color:#FFFFFF; border-radius:14px;">
<tr><td style="padding:36px 40px;">
<p style="margin:0; font-family:${FONT_STACK}; font-size:20px; font-weight:700; letter-spacing:2px; color:#1F1F1F;">MURMUR</p>
<p style="margin:24px 0 0; font-family:${FONT_STACK}; font-size:15px; line-height:1.5; color:#1F1F1F;">Use this code to confirm your account deletion:</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;">
<tr><td style="background-color:#F2F2F2; border-radius:10px; padding:16px 28px;">
<!-- white-space:nowrap keeps letter-spaced digits on one line in clients that wrap them. -->
<span style="font-family:${FONT_STACK}; font-size:32px; font-weight:700; letter-spacing:8px; white-space:nowrap; color:#1F1F1F;">${code}</span>
</td></tr>
</table>
<p style="margin:20px 0 0; font-family:${FONT_STACK}; font-size:14px; line-height:1.5; color:#1F1F1F;">This code expires in ${expiresMinutes} minutes.</p>
<p style="margin:16px 0 0; font-family:${FONT_STACK}; font-size:13px; line-height:1.5; color:#6F6F6F;">If you didn&#39;t request account deletion, you can safely ignore this email.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export const renderDeletionCodeEmailText = ({
	code,
	expiresMinutes,
}: DeletionCodeEmailInput): string =>
	`Your Murmur confirmation code is ${code} — it expires in ${expiresMinutes} minutes.\n\n` +
	`If you didn't request account deletion, you can safely ignore this email.\n`;
