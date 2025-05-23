import { getTestEmailCount } from '@/app/utils/calculations';
import { SubscriptionTierData } from '@/types';

export const SUBSCRIPTION_TIER_DATA_LIST: Record<string, SubscriptionTierData> = {
	[process.env.NEXT_PUBLIC_ESSENTIALS_PRICE_ID as string]: {
		name: 'Essentials',
		aiEmailCount: 500,
		viewEmailAddresses: false,
		get testEmailCount() {
			return getTestEmailCount(this.aiEmailCount);
		},
	},
	custom: {
		name: 'Custom',
		aiEmailCount: 1000,
		viewEmailAddresses: false,
		get testEmailCount() {
			return getTestEmailCount(this.aiEmailCount);
		},
	},
	[process.env.NEXT_PUBLIC_PROFESSIONAL_PRICE_ID as string]: {
		name: 'Professional',
		aiEmailCount: 1500,
		viewEmailAddresses: false,
		get testEmailCount() {
			return getTestEmailCount(this.aiEmailCount);
		},
	},
	[process.env.NEXT_PUBLIC_ELITE_PRICE_ID as string]: {
		name: 'Elite',
		aiEmailCount: 5000,
		viewEmailAddresses: true,
		get testEmailCount() {
			return getTestEmailCount(this.aiEmailCount);
		},
	},
	[process.env.NEXT_PUBLIC_PROPHET_PRICE_ID as string]: {
		name: 'Prophet',
		aiEmailCount: 7500,
		viewEmailAddresses: true,
		get testEmailCount() {
			return getTestEmailCount(this.aiEmailCount);
		},
	},
	[process.env.NEXT_PUBLIC_ADMIN_LITE_PRICE_ID as string]: {
		name: 'Prophet',
		aiEmailCount: 100000,
		viewEmailAddresses: false,
		get testEmailCount() {
			return getTestEmailCount(this.aiEmailCount);
		},
	},
	[process.env.NEXT_PUBLIC_ADMIN_FULL_PRICE_ID as string]: {
		name: 'Prophet',
		aiEmailCount: 500000,
		viewEmailAddresses: true,
		get testEmailCount() {
			return getTestEmailCount(this.aiEmailCount);
		},
	},
};
