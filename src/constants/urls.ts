export const urls = {
	home: {
		path: '/',
		label: 'Home',
		category: 'mainMenu',
	},
	about: {
		path: '/about',
		label: 'About Us',
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
	admin: {
		path: '/admin',
		label: 'Admin',
		category: 'protected',
		contacts: {
			path: '/admin/contacts',
			label: 'Contacts',
		},
		products: {
			path: '/admin/products',
			label: 'Products',
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
	api: {
		auth: {
			path: '/api/auth',
		},
		campaigns: {
			path: '/api/campaigns',
		},
		'contact-list': {
			path: '/api/contact-list',
		},
		contacts: {
			path: '/api/contacts',
		},
		emails: {
			path: '/api/emails',
		},
	},
};
