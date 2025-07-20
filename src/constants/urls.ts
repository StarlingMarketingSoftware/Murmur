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
		users: {
			index: '/admin/users',
			detail: ((id) => `/admin/users/${id}`) as DetailRoute,
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
		apollo: {
			index: '/api/apollo',
		},
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
		contactVerificationRequests: {
			index: '/api/contact-verification-requests',
			detail: ((id) => `/api/contact-verification-requests/${id}`) as DetailRoute,
		},
		contacts: {
			index: '/api/contacts',
			usedContacts: {
				index: '/api/contacts/used-contacts',
			},
			batch: {
				index: '/api/contacts/batch',
				private: {
					index: '/api/contacts/batch/private',
				},
			},
			detail: ((id) => `/api/contacts/${id}`) as DetailRoute,
		},
		emails: {
			index: '/api/emails',
			detail: ((id) => `/api/emails/${id}`) as DetailRoute,
		},
		emailVerificationCodes: {
			index: '/api/email-verification-codes',
		},
		identities: {
			index: '/api/identities',
			detail: ((id) => `/api/identities/${id}`) as DetailRoute,
		},
		mailgun: {
			index: '/api/mailgun',
		},
		mistral: {
			index: '/api/mistral',
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
				manageSubscription: {
					index: '/api/stripe/portal/manage-subscription',
				},
				updateSubscription: {
					index: '/api/stripe/portal/update-subscription',
				},
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
		userContactList: {
			index: '/api/user-contact-lists',
			detail: ((id) => `/api/user-contact-lists/${id}`) as DetailRoute,
		},
		users: {
			index: '/api/users',
			detail: ((id) => `/api/users/${id}`) as DetailRoute,
		},
	},
};
