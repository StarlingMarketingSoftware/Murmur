import { z } from 'zod';
import { urls } from '@/constants/urls';

const APP_ORIGIN_FOR_VALIDATION = 'https://murmur.local';
const MAX_CHECKOUT_RETURN_PATH_LENGTH = 2048;

export const checkoutReturnPathSchema = z
	.string()
	.trim()
	.min(1)
	.max(MAX_CHECKOUT_RETURN_PATH_LENGTH)
	.refine(isSafeCheckoutReturnPath, {
		message: 'Checkout return path must be a relative application path',
	});

export function isSafeCheckoutReturnPath(path: string): boolean {
	const trimmed = path.trim();
	if (!trimmed.startsWith('/')) return false;
	if (trimmed.startsWith('//')) return false;
	if (trimmed.includes('\\')) return false;

	try {
		const url = new URL(trimmed, APP_ORIGIN_FOR_VALIDATION);
		return url.origin === APP_ORIGIN_FOR_VALIDATION && url.pathname.startsWith('/');
	} catch {
		return false;
	}
}

export function getHostedCheckoutCancelPath(cancelPath?: string): string {
	return cancelPath ?? urls.pricing.index;
}
