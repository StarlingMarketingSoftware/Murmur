import { Url } from './types';

export const urls: Record<string, Url> = {
	home: {
		path: '/',
		label: 'Home',
		category: 'mainMenu',
	},
	murmur: {
		path: '/murmur',
		label: 'Murmur',
		category: 'protected',
	},
	pricing: {
		path: '/pricing',
		label: 'Pricing',
		category: 'mainMenu',
	},
	contact: {
		path: '/contact',
		label: 'Contact',
		category: 'mainMenu',
	},
	signIn: {
		path: '/sign-in',
		label: 'Sign In',
	},
	signUp: {
		path: '/sign-up',
		label: 'Sign Up',
	},
};
