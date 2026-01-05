'use client';

import React, { createContext, useContext } from 'react';

export type CampaignTopSearchHighlightContextValue = {
	isTopSearchHighlighted: boolean;
	setTopSearchHighlighted: (highlighted: boolean) => void;
};

const CampaignTopSearchHighlightContext =
	createContext<CampaignTopSearchHighlightContextValue>({
		isTopSearchHighlighted: false,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		setTopSearchHighlighted: () => {},
	});

export function CampaignTopSearchHighlightProvider({
	value,
	children,
}: {
	value: CampaignTopSearchHighlightContextValue;
	children: React.ReactNode;
}) {
	return (
		<CampaignTopSearchHighlightContext.Provider value={value}>
			{children}
		</CampaignTopSearchHighlightContext.Provider>
	);
}

export function useCampaignTopSearchHighlight() {
	return useContext(CampaignTopSearchHighlightContext);
}


