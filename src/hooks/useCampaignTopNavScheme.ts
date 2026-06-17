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
	const id = typeof campaignId === 'string' ? Number(campaignId) : campaignId;
	const orderIndex =
		id == null || Number.isNaN(id)
			? -1
			: [...((data ?? []) as Array<{ id: number }>)]
					.sort((a, b) => a.id - b.id)
					.findIndex((c) => c.id === id);
	return CAMPAIGN_TOP_NAV_SCHEMES[
		orderIndex < 0 ? 0 : orderIndex % CAMPAIGN_TOP_NAV_SCHEMES.length
	];
};
