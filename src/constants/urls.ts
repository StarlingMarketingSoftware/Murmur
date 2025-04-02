export const urls = {
	home: {
		path: '/',
		label: 'Home',
		category: 'mainMenu',
	},
	murmur: {
		path: '/murmur',
		label: 'Murmur',
		category: 'protected',
		dashboard: {
			path: '/murmur/dashboard',
			label: 'Murmur',
			category: 'protected',
		},
		campaign: {
			path: '/murmur/campaign',
		},
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
