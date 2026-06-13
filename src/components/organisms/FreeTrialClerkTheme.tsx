'use client';

const CLERK_CARD_FILL = '#6FCF84';
const CLERK_CARD_STROKE = '#000000';
const CLERK_CONTINUE_BUTTON_FILL = '#8E8E8E';
const CLERK_CONTINUE_BUTTON_HOVER_FILL = '#808080';
const CLERK_SOCIAL_BUTTON_FILL = '#ffffff';
const CLERK_SOCIAL_BUTTON_HOVER_FILL = '#e6e6e6';

export const FREE_TRIAL_CLERK_APPEARANCE = {
	variables: {
		colorPrimary: CLERK_CARD_STROKE,
		colorText: CLERK_CARD_STROKE,
		colorTextSecondary: CLERK_CARD_STROKE,
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
			boxShadow: 'none',
			backgroundColor: CLERK_CARD_FILL,
			border: `3px solid ${CLERK_CARD_STROKE}`,
			borderRadius: '12px',
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
		footer: { flexShrink: 0 },
		headerTitle: { color: CLERK_CARD_STROKE },
		headerSubtitle: { color: CLERK_CARD_STROKE },
		formFieldLabel: { color: CLERK_CARD_STROKE },
		formFieldInput: {
			border: `2px solid ${CLERK_CARD_STROKE}`,
			boxShadow: 'none',
			backgroundColor: '#ffffff',
			color: CLERK_CARD_STROKE,
		},
		// Use a class so we can control :hover (Clerk adds a green-ish hover by default).
		// The base styles are applied via CSS below.
		socialButtonsBlockButton: 'free-trial-clerk-social-button',
		dividerLine: { backgroundColor: CLERK_CARD_STROKE },
		dividerText: { color: CLERK_CARD_STROKE },
		footerActionLink: { color: CLERK_CARD_STROKE },
		// Use a class so we can neutralize gradients/pseudo-elements with CSS.
		formButtonPrimary: 'free-trial-clerk-primary-button',
	},
} as const;

export function FreeTrialClerkGlobalStyles() {
	return (
		<style jsx global>{`
			/* Clerk: force a truly flat primary button (no gradients/overlays). */
			.free-trial-clerk-primary-button,
			.free-trial-clerk-primary-button:focus,
			.free-trial-clerk-primary-button:active {
				background: ${CLERK_CONTINUE_BUTTON_FILL} !important;
				background-image: none !important;
				box-shadow: none !important;
				filter: none !important;
				border: 2px solid ${CLERK_CARD_STROKE} !important;
				color: #ffffff !important;
				text-shadow: none !important;
				text-transform: none !important;
			}

			.free-trial-clerk-primary-button:hover {
				background: ${CLERK_CONTINUE_BUTTON_HOVER_FILL} !important;
				background-image: none !important;
				box-shadow: none !important;
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
				box-shadow: none !important;
				filter: none !important;
				border: 2px solid ${CLERK_CARD_STROKE} !important;
				color: ${CLERK_CARD_STROKE} !important;
				text-shadow: none !important;
			}

			.free-trial-clerk-social-button:hover {
				background: ${CLERK_SOCIAL_BUTTON_HOVER_FILL} !important;
				background-image: none !important;
				box-shadow: none !important;
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
				scrollbar-color: #000000 transparent !important;
				-webkit-overflow-scrolling: touch;
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
