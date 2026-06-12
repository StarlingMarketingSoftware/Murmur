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
		// Put the stroke on the outer container so it wraps the footer too.
		cardBox: {
			boxShadow: 'none',
			backgroundColor: CLERK_CARD_FILL,
			border: `3px solid ${CLERK_CARD_STROKE}`,
			borderRadius: '12px',
			overflow: 'hidden',
		},
		card: {
			boxShadow: 'none',
			backgroundColor: 'transparent',
			border: 'none',
			borderRadius: 0,
		},
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
		`}</style>
	);
}
