import { Url } from "./types";


export const urls: Record<string, Url> = {
	home: {
    path: '/',
    label: 'Home',
    category: 'mainMenu',
  },
	dashboard: {
    path: '/dashboard',
    label: 'Dashboard',
    category: 'protected',
  },
	products: {
    path: '/products',
    label: 'Products',
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