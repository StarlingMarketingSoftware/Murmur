'use client';

import { createContext, type FC, type ReactNode, useContext } from 'react';

export type CampaignViewType =
	| 'contacts'
	| 'testing'
	| 'drafting'
	| 'sent'
	| 'inbox'
	| 'all';

export type CampaignDeviceContextValue = {
	/**
	 * Mirrors the campaign page's `useIsMobile()` value.
	 * - null: unknown during initial hydration
	 * - true: real mobile device
	 * - false: desktop
	 */
	isMobile: boolean | null;
	/**
	 * The campaign page's current view/tab.
	 * This lets skeletons match the correct mobile layout (e.g. Inbox vs Contacts).
	 */
	activeView: CampaignViewType | null;
};

const CampaignDeviceContext = createContext<CampaignDeviceContextValue>({
	isMobile: null,
	activeView: null,
});

export const CampaignDeviceProvider: FC<CampaignDeviceContextValue & { children: ReactNode }> = ({
	isMobile,
	activeView,
	children,
}) => {
	return (
		<CampaignDeviceContext.Provider value={{ isMobile, activeView }}>
			{children}
		</CampaignDeviceContext.Provider>
	);
};

export const useCampaignDevice = (): CampaignDeviceContextValue => {
	return useContext(CampaignDeviceContext);
};

