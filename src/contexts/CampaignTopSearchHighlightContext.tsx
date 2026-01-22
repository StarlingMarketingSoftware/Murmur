'use client';

import React, { createContext, useContext } from 'react';

export type CampaignTopSearchHighlightContextValue = {
	isTopSearchHighlighted: boolean;
	setTopSearchHighlighted: (highlighted: boolean) => void;
	isHomeButtonHighlighted: boolean;
	setHomeButtonHighlighted: (highlighted: boolean) => void;
	isDraftsTabHighlighted: boolean;
	setDraftsTabHighlighted: (highlighted: boolean) => void;
	isInboxTabHighlighted: boolean;
	setInboxTabHighlighted: (highlighted: boolean) => void;
	isWriteTabHighlighted: boolean;
	setWriteTabHighlighted: (highlighted: boolean) => void;
};

const CampaignTopSearchHighlightContext =
	createContext<CampaignTopSearchHighlightContextValue>({
		isTopSearchHighlighted: false,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		setTopSearchHighlighted: () => {},
		isHomeButtonHighlighted: false,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		setHomeButtonHighlighted: () => {},
		isDraftsTabHighlighted: false,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		setDraftsTabHighlighted: () => {},
		isInboxTabHighlighted: false,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		setInboxTabHighlighted: () => {},
		isWriteTabHighlighted: false,
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		setWriteTabHighlighted: () => {},
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


