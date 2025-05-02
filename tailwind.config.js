/** @type {import('tailwindcss').Config} */

module.exports = {
	content: [
		'./app/**/*.{js,jsx,ts,tsx}',
		'./features/**/*.{js,jsx,ts,tsx}',
		'./src/**/*.{js,ts,jsx,tsx,mdx}',
	],
	darkMode: 'selector',
	theme: {
		extend: {
			fontFamily: {
				header: ['var(--font-francois)'],
				paragraph: ['var(--font-spartan)'],
				'header-jp': ['var(--font-zen)'],
				'paragraph-jp': ['var(--font-noto)'],
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
			},
			keyframes: {
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
