'use client';

import {
	createContext,
	type FC,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from 'react';

/**
 * Campaign send-queue VIEW open/close state.
 *
 * The header "in send queue" pill (CampaignHeaderBox) toggles this; DraftingSection
 * reads it to swap the normal campaign slots for the send-queue list/deck/research
 * view. Kept as a tiny context so the open-state is shared across the campaign page's
 * several header instances without prop-threading. Defaults to a no-op so the header
 * still renders outside the provider.
 */
export interface SendQueueViewContextValue {
	isOpen: boolean;
	open: () => void;
	close: () => void;
	toggle: () => void;
}

const SendQueueViewContext = createContext<SendQueueViewContextValue>({
	isOpen: false,
	open: () => {},
	close: () => {},
	toggle: () => {},
});

export const SendQueueViewProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const [isOpen, setIsOpen] = useState(false);
	const value = useMemo<SendQueueViewContextValue>(
		() => ({
			isOpen,
			open: () => setIsOpen(true),
			close: () => setIsOpen(false),
			toggle: () => setIsOpen((v) => !v),
		}),
		[isOpen]
	);
	return (
		<SendQueueViewContext.Provider value={value}>{children}</SendQueueViewContext.Provider>
	);
};

export const useSendQueueView = (): SendQueueViewContextValue =>
	useContext(SendQueueViewContext);
