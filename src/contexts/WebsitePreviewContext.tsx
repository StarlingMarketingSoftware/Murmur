'use client';

import {
	createContext,
	type FC,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';
import { normalizeWebsiteUrl, websiteHost } from '@/utils/websiteUrl';
import { useIsMobile } from '@/hooks/useIsMobile';
import { WebsitePreviewOverlay } from '@/components/organisms/WebsitePreviewOverlay/WebsitePreviewOverlay';

/** Viewport-space rect of the research card the preview should sit beside. */
export type WebsitePreviewAnchorRect = {
	left: number;
	top: number;
	width: number;
	height: number;
};

export type WebsitePreviewSize = 'default' | 'large';
export type WebsitePreviewPlacement = 'auto' | 'left-slot';

export type WebsitePreviewOptions = {
	label?: string;
	contactId?: number | null;
	size?: WebsitePreviewSize;
	placement?: WebsitePreviewPlacement;
	/**
	 * The research card's viewport rect. When provided, the preview docks just to
	 * the side of it (over the map) instead of centering — see WebsitePreviewOverlay.
	 */
	anchorRect?: WebsitePreviewAnchorRect | null;
};

type WebsitePreviewActions = {
	/**
	 * Opens the website-preview panel for the given (raw or normalized) url.
	 * No-ops when the url can't be normalized to a valid http(s) URL. On mobile it
	 * opens a new tab instead of the in-app iframe.
	 */
	openWebsite: (rawUrl: string | null | undefined, opts?: WebsitePreviewOptions) => void;
	close: () => void;
	activeContactId: number | null;
	activeAnchorRect: WebsitePreviewAnchorRect | null;
};

// Default is a no-op so consumers rendered OUTSIDE the provider (e.g. ContactResearchPanel
// on landing/demo pages) never throw — the Website row simply does nothing there.
const WebsitePreviewContext = createContext<WebsitePreviewActions>({
	openWebsite: () => {},
	close: () => {},
	activeContactId: null,
	activeAnchorRect: null,
});

export const useWebsitePreview = (): WebsitePreviewActions =>
	useContext(WebsitePreviewContext);

/**
 * Builds the anchor rect from the clicked element's nearest research-panel root
 * (falling back to the element itself), so the preview can dock beside the card.
 */
export const buildWebsiteAnchorRect = (
	target: HTMLElement | null
): WebsitePreviewAnchorRect | null => {
	if (!target) return null;
	const root =
		(target.closest(
			'[data-contact-research-panel], [data-research-panel-container]'
		) as HTMLElement | null) ?? target;
	const r = root.getBoundingClientRect();
	return { left: r.left, top: r.top, width: r.width, height: r.height };
};

type ActivePreview = {
	url: string;
	label: string;
	contactId: number | null;
	size: WebsitePreviewSize;
	placement: WebsitePreviewPlacement;
	anchorRect: WebsitePreviewAnchorRect | null;
};

export const WebsitePreviewProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const isMobile = useIsMobile();
	const [active, setActive] = useState<ActivePreview | null>(null);

	const openWebsite = useCallback(
		(rawUrl: string | null | undefined, opts?: WebsitePreviewOptions) => {
			const url = normalizeWebsiteUrl(rawUrl);
			if (!url) return;
			// A tiny in-app iframe is poor UX on phones, and most sites block framing —
			// open directly in a new tab instead. Same for a URL that resolves to our OWN
			// origin: never embed first-party pages in the scripted preview iframe.
			let isSelfOrigin = false;
			if (typeof window !== 'undefined') {
				try {
					isSelfOrigin = new URL(url).host === window.location.host;
				} catch {
					isSelfOrigin = false;
				}
			}
			if (isMobile === true || isSelfOrigin) {
				if (typeof window !== 'undefined') {
					window.open(url, '_blank', 'noopener,noreferrer');
				}
				return;
			}
			setActive({
				url,
				label: opts?.label || websiteHost(url),
				contactId: opts?.contactId ?? null,
				size: opts?.size ?? 'default',
				placement: opts?.placement ?? 'auto',
				anchorRect: opts?.anchorRect ?? null,
			});
		},
		[isMobile]
	);

	const close = useCallback(() => setActive(null), []);

	const actions = useMemo<WebsitePreviewActions>(
		() => ({
			openWebsite,
			close,
			activeContactId: active?.contactId ?? null,
			activeAnchorRect: active?.anchorRect ?? null,
		}),
		[openWebsite, close, active?.contactId, active?.anchorRect]
	);

	return (
		<WebsitePreviewContext.Provider value={actions}>
			{children}
			<WebsitePreviewOverlay
				url={active?.url ?? null}
				label={active?.label ?? ''}
				size={active?.size ?? 'default'}
				placement={active?.placement ?? 'auto'}
				anchorRect={active?.anchorRect ?? null}
				onClose={close}
			/>
		</WebsitePreviewContext.Provider>
	);
};
