'use client';

import { useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';

export interface CampaignTopNavScheme {
	/** Backdrop-box background color (applied at opacity 0.9 by the box itself). */
	box: string;
	/** Folder-icon fill color. */
	icon: string;
}

// Per-campaign color schemes for the top navigation box, indexed by the
// campaign's creation order (oldest first). Scheme 0 reproduces the original
// look so the first campaign is unchanged; campaigns 2–5 tint the backdrop box
// and recolor the folder icon. Max 5 campaigns per user (MAX_CAMPAIGNS), so the
// 5 schemes map 1:1; the modulo only guards against unexpected overflow.
export const CAMPAIGN_TOP_NAV_SCHEMES: CampaignTopNavScheme[] = [
	{ box: '#B9EAF1', icon: '#B43A35' },
	{ box: '#D8D4FD', icon: '#CB56D1' },
	{ box: '#C6F6ED', icon: '#A256D1' },
	{ box: '#F5E4D3', icon: '#56BFD1' },
	{ box: '#F0CCE3', icon: '#E1A745' },
];

/**
 * Pure, id-keyed resolver for a campaign's folder colorway. This is the SINGLE
 * SOURCE OF TRUTH for per-campaign folder colors across every surface (top-nav
 * box, campaign header box, the campaigns finder/table folder pills + folder SVG,
 * the folder-switcher dropdown, and the mobile folder cards/inbox chips).
 *
 * The scheme is derived from the campaign's position in the user's campaign list
 * SORTED BY ID ASCENDING (oldest first) — NOT the display/render order — so a
 * given campaign keeps the same color no matter how a surface happens to sort or
 * reorder its rows. Falls back to scheme 0 when the id is missing/unknown (e.g. a
 * just-created campaign not yet cached), matching the hook's loading fallback.
 */
export const getCampaignTopNavSchemeIndex = (
	campaignId: number | string | null | undefined,
	campaigns: ReadonlyArray<{ id: number }> | null | undefined
): number => {
	const id = typeof campaignId === 'string' ? Number(campaignId) : campaignId;
	if (id == null || Number.isNaN(id)) return 0;
	const orderIndex = [...(campaigns ?? [])]
		.sort((a, b) => a.id - b.id)
		.findIndex((c) => c.id === id);
	if (orderIndex < 0) return 0;
	return orderIndex % CAMPAIGN_TOP_NAV_SCHEMES.length;
};

/** Pure, id-keyed scheme resolver (see {@link getCampaignTopNavSchemeIndex}). */
export const getCampaignTopNavScheme = (
	campaignId: number | string | null | undefined,
	campaigns: ReadonlyArray<{ id: number }> | null | undefined
): CampaignTopNavScheme =>
	CAMPAIGN_TOP_NAV_SCHEMES[getCampaignTopNavSchemeIndex(campaignId, campaigns)];

/**
 * Resolves a campaign's top-nav color scheme from its position in the user's
 * campaign list (oldest = scheme 0). Deriving it from the shared campaign list
 * keeps every surface (dashboard map header + campaign page header) in agreement
 * for a given campaign. Falls back to scheme 0 while the list loads or the id
 * isn't found (e.g. a just-created campaign not yet cached).
 */
export const useCampaignTopNavScheme = (
	campaignId?: number | string | null
): CampaignTopNavScheme => {
	const { data } = useGetCampaigns();
	return getCampaignTopNavScheme(campaignId, (data ?? []) as Array<{ id: number }>);
};
