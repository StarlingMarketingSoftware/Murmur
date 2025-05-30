type DetailRoute = <T extends string | number>(id: T) => string;

export const urls = {
	home: {
		index: '/',
	},
	about: {
		index: '/about',
	},
	murmur: {
		index: '/murmur',
		dashboard: {
			index: '/murmur/dashboard',
		},
		campaign: {
			index: '/murmur/campaign',
			detail: ((id) => `/murmur/campaign/${id}`) as DetailRoute,
		},
	},
	admin: {
		index: '/admin',
		contacts: {
			index: '/admin/contacts',
			detail: ((id) => `/admin/contacts/${id}`) as DetailRoute,
		},
		products: {
			index: '/admin/products',
		},
	},
	pricing: {
		index: '/pricing',
		detail: ((id) => `/pricing/${id}`) as DetailRoute,
	},
	contact: {
		index: '/contact',
	},
	signIn: {
		index: '/sign-in',
	},
	signUp: {
		index: '/sign-up',
	},
	api: {
		auth: {
			index: '/api/auth',
			checkAdmin: {
				index: '/api/auth/check-admin',
			},
		},
		campaigns: {
			index: '/api/campaigns',
			detail: ((id) => `/api/campaigns/${id}`) as DetailRoute,
		},
		contactList: {
			index: '/api/contact-list',
			detail: ((id) => `/api/contact-list/${id}`) as DetailRoute,
		},
		contacts: {
			index: '/api/contacts',
			batch: {
				index: '/api/contacts/batch',
			},
			detail: ((id) => `/api/contacts/${id}`) as DetailRoute,
		},
		emails: {
			index: '/api/emails',
			detail: ((id) => `/api/emails/${id}`) as DetailRoute,
		},
		mailgun: {
			index: '/api/mailgun',
		},
		openai: {
			index: '/api/openai',
		},
		perplexity: {
			index: '/api/perplexity',
		},
		signatures: {
			index: '/api/signatures',
			detail: ((id) => `/api/signatures/${id}`) as DetailRoute,
		},
		stripe: {
			checkout: {
				index: '/api/stripe/checkout',
			},
			portal: {
				index: '/api/stripe/portal',
				customProduct: {
					index: '/api/stripe/portal/custom-product',
				},
			},
			prices: {
				index: '/api/stripe/prices',
				detail: ((id) => `/api/stripe/prices/${id}`) as DetailRoute,
			},
			products: {
				index: '/api/stripe/products',
				detail: ((id) => `/api/stripe/products/${id}`) as DetailRoute,
			},
			updateSubscription: {
				index: '/api/stripe/update-subscription',
			},
		},
		users: {
			index: '/api/users',
			detail: ((id) => `/api/users/${id}`) as DetailRoute,
		},
	},
};
