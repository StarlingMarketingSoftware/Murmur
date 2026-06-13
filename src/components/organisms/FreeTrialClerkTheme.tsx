'use client';

import { withClerkNoBranding } from '@/constants/auth';

const CLERK_CARD_FILL = '#FFFFFF';
const CLERK_CARD_STROKE = '#D9D6CE';
const CLERK_TEXT = '#111113';
const CLERK_TEXT_SECONDARY = '#62666F';
const CLERK_CONTINUE_BUTTON_FILL = '#111113';
const CLERK_CONTINUE_BUTTON_HOVER_FILL = '#2A2A2D';
const CLERK_SOCIAL_BUTTON_FILL = '#ffffff';
const CLERK_SOCIAL_BUTTON_HOVER_FILL = '#F7F6F3';

export const FREE_TRIAL_CLERK_APPEARANCE = withClerkNoBranding({
	variables: {
		colorPrimary: CLERK_TEXT,
		colorText: CLERK_TEXT,
		colorTextSecondary: CLERK_TEXT_SECONDARY,
		// Note: Clerk uses this as a base background for some surfaces.
		// We still explicitly set the card's background below to ensure the exact fill.
		colorBackground: CLERK_CARD_FILL,
	},
	elements: {
		// Viewport-fit chain: the modal wrapper clamps rootBox's height, cardBox
		// becomes a flex column capped to it, and the form area (.cl-card) scrolls
		// internally while the footer stays pinned inside the border. On tall
		// windows nothing overflows and the clamp is inert.
		rootBox: {
			display: 'flex',
			maxHeight: '100%',
			minHeight: 0,
		},
		// Put the stroke on the outer container so it wraps the footer too.
		cardBox: {
			width: 'min(calc(100vw - 16px), 420px)',
			boxSizing: 'border-box',
			boxShadow:
				'0 26px 80px rgba(17, 17, 19, 0.24), 0 2px 10px rgba(17, 17, 19, 0.08)',
			backgroundColor: CLERK_CARD_FILL,
			border: `1px solid ${CLERK_CARD_STROKE}`,
			borderRadius: '18px',
			overflow: 'hidden',
			display: 'flex',
			flexDirection: 'column',
			maxHeight: '100%',
			minHeight: 0,
		},
		card: {
			boxShadow: 'none',
			backgroundColor: 'transparent',
			border: 'none',
			borderRadius: 0,
			minHeight: 0,
			overflowY: 'auto',
			// Don't let internal rubber-banding chain to the (locked) page behind.
			overscrollBehavior: 'contain',
		},
		footer: {
			flexShrink: 0,
			backgroundColor: '#FBFAF7',
			borderTop: `1px solid ${CLERK_CARD_STROKE}`,
		},
		headerTitle: { color: CLERK_TEXT, letterSpacing: 0 },
		headerSubtitle: { color: CLERK_TEXT_SECONDARY },
		formFieldLabel: { color: CLERK_TEXT },
		formFieldInput: {
			border: `1px solid #D7DADF`,
			boxShadow: 'none',
			backgroundColor: '#FBFBFA',
			color: CLERK_TEXT,
		},
		// Use a class so we can control :hover (Clerk adds a green-ish hover by default).
		// The base styles are applied via CSS below.
		socialButtonsBlockButton: 'free-trial-clerk-social-button',
		dividerLine: { backgroundColor: '#DFE1E5' },
		dividerText: { color: CLERK_TEXT },
		footerActionLink: { color: CLERK_TEXT },
		// Use a class so we can neutralize gradients/pseudo-elements with CSS.
		formButtonPrimary: 'free-trial-clerk-primary-button',
	},
} as const);

export function FreeTrialClerkGlobalStyles() {
	return (
		<style jsx global>{`
			/* Clerk: force a truly flat primary button (no gradients/overlays). */
			.free-trial-clerk-primary-button,
			.free-trial-clerk-primary-button:focus,
			.free-trial-clerk-primary-button:active {
				background: ${CLERK_CONTINUE_BUTTON_FILL} !important;
				background-image: none !important;
				box-shadow: 0 8px 18px rgba(17, 17, 19, 0.16) !important;
				filter: none !important;
				border: 1px solid ${CLERK_TEXT} !important;
				color: #ffffff !important;
				text-shadow: none !important;
				text-transform: none !important;
			}

			.free-trial-clerk-primary-button:hover {
				background: ${CLERK_CONTINUE_BUTTON_HOVER_FILL} !important;
				background-image: none !important;
				box-shadow: 0 10px 22px rgba(17, 17, 19, 0.18) !important;
				filter: none !important;
			}

			.free-trial-clerk-primary-button::before,
			.free-trial-clerk-primary-button::after {
				background: none !important;
				background-image: none !important;
				box-shadow: none !important;
				filter: none !important;
			}

			/* Clerk: keep social buttons neutral on hover (no green tint). */
			.free-trial-clerk-social-button,
			.free-trial-clerk-social-button:focus,
			.free-trial-clerk-social-button:active {
				background: ${CLERK_SOCIAL_BUTTON_FILL} !important;
				background-image: none !important;
				box-shadow: 0 1px 2px rgba(17, 17, 19, 0.05) !important;
				filter: none !important;
				border: 1px solid ${CLERK_CARD_STROKE} !important;
				color: ${CLERK_TEXT} !important;
				text-shadow: none !important;
			}

			.free-trial-clerk-social-button:hover {
				background: ${CLERK_SOCIAL_BUTTON_HOVER_FILL} !important;
				background-image: none !important;
				box-shadow: 0 3px 10px rgba(17, 17, 19, 0.08) !important;
				filter: none !important;
			}

			.free-trial-clerk-social-button::before,
			.free-trial-clerk-social-button::after {
				background: none !important;
				background-image: none !important;
				box-shadow: none !important;
				filter: none !important;
			}

			/* Internal form scroller: thin black scrollbar (site convention). */
			.free-trial-clerk-modal .cl-card {
				scrollbar-width: thin !important;
				scrollbar-color: ${CLERK_TEXT} transparent !important;
				-webkit-overflow-scrolling: touch;
			}

			.free-trial-clerk-modal .cl-formFieldInput:focus {
				border-color: ${CLERK_TEXT} !important;
				box-shadow: 0 0 0 3px rgba(17, 17, 19, 0.08) !important;
			}

			/* Phones: tighten the Clerk card so little (or nothing) needs to
			   scroll. Scoped to the modal so the navbar Clerk UI is untouched. */
			@media (max-width: 639px) {
				.free-trial-clerk-modal .cl-card {
					padding: 1rem 1rem 1.25rem !important;
					gap: 0.875rem !important;
				}
				.free-trial-clerk-modal .cl-header {
					gap: 0.125rem !important;
				}
				.free-trial-clerk-modal .cl-headerTitle {
					font-size: 1.0625rem !important;
				}
				.free-trial-clerk-modal .cl-headerSubtitle {
					font-size: 0.8125rem !important;
				}
				.free-trial-clerk-modal .cl-main {
					gap: 0.875rem !important;
				}
				.free-trial-clerk-modal .cl-form {
					gap: 0.75rem !important;
				}
				.free-trial-clerk-modal .cl-socialButtons {
					gap: 0.5rem !important;
				}
				.free-trial-clerk-modal .cl-footer .cl-footerAction {
					padding: 0.625rem 1rem !important;
				}
			}
		`}</style>
	);
}
