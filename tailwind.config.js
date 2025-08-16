/** @type {import('tailwindcss').Config} */
const { amber, cyan, green, rose, stone } = require('tailwindcss/colors');

module.exports = {
	content: [
		'./app/**/*.{js,jsx,ts,tsx}',
		'./features/**/*.{js,jsx,ts,tsx}',
		'./src/**/*.{js,ts,jsx,tsx,mdx}',
	],
	darkMode: 'selector',
	theme: {
		extend: {
			screens: {
				xs: '480px',
			},
			fontSize: {
				'8xl': '6rem', // 96px
				'9xl': '8rem', // 128px
				'10xl': '10rem', // 160px
				xs: '0.65rem', // 10.4px - smaller than default xs
			},
			fontFamily: {
				primary: ['var(--font-times)'],
				secondary: ['var(--font-inter)'],
			},

			colors: {
				'ui-01': {
					DEFAULT: stone[50],
					light: stone[50],
					dark: stone[50],
				},
				'ui-02': {
					DEFAULT: stone[200],
					light: stone[900],
					dark: stone[900],
				},
				primary: stone[950],
				accent: cyan[800],
				secondary: stone[700],
				success: green[800],
				warning: amber[600],
				error: rose[800],
			},
			animation: {
				'flicker-opacity': 'flicker-opacity 1.5s infinite',
				scroll: 'scroll 30s linear infinite',
				'dialog-overlay-show': 'dialog-overlay-show 150ms cubic-bezier(0.16, 1, 0.3, 1)',
				'dialog-content-show': 'dialog-content-show 150ms cubic-bezier(0.16, 1, 0.3, 1)',
			},
			keyframes: {
				'dialog-overlay-show': {
					from: { opacity: 0 },
					to: { opacity: 1 },
				},
				'dialog-content-show': {
					from: { opacity: 0, transform: 'translate(-50%, -48%) scale(0.96)' },
					to: { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
				},
				'flicker-opacity': {
					'0%': { opacity: '70%' },
					'1%': { opacity: '35%' },
					'50%': { opacity: '35%' },
					'51%': { opacity: '70%' },
					'100%': { opacity: '70%' },
				},

				scroll: {
					'0%': { transform: 'translateX(0)' },
					'100%': { transform: 'translateX(calc(-50%))' },
				},
			},
		},
	},
	plugins: [],
};
