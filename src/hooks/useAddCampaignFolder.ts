'use client';

import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
	CampaignApiError,
	useCreateCampaign,
	useGetCampaigns,
} from '@/hooks/queryHooks/useCampaigns';
import { useCreateUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { generateCampaignName } from '@/utils/campaignNames';
import { urls } from '@/constants/urls';

export const MAX_CAMPAIGNS = 5;
const CAP_REACHED_MESSAGE = `You have reached the maximum of ${MAX_CAMPAIGNS} active campaigns. Delete one to create a new one.`;

/**
 * Creates a new campaign "folder" (a contact list + its campaign) with an
 * auto-generated name, enforcing the 5-campaign cap. Shared by the folder
 * dropdown and the All-tab folders table so the two stay in sync.
 */
export const useAddCampaignFolder = () => {
	const router = useRouter();
	const { data: campaignsData } = useGetCampaigns();
	const { mutateAsync: createContactList, isPending: isPendingCreateContactList } =
		useCreateUserContactList({ suppressToasts: true });
	const { mutateAsync: createCampaign, isPending: isPendingCreateCampaign } =
		useCreateCampaign({ suppressToasts: true });
	const isAddingFolder = isPendingCreateContactList || isPendingCreateCampaign;

	const addFolder = async () => {
		if (isAddingFolder) return;

		const campaigns = (campaignsData ?? []) as Array<{ name?: unknown }>;
		if (campaigns.length >= MAX_CAMPAIGNS) {
			toast.error(CAP_REACHED_MESSAGE);
			return;
		}

		const existingNames = campaigns
			.map((c) => (typeof c.name === 'string' ? c.name : null))
			.filter((name): name is string => Boolean(name));
		const name = generateCampaignName(existingNames);

		try {
			const contactList = await createContactList({ name, contactIds: [] });
			const campaign = await createCampaign({ name, userContactLists: [contactList.id] });
			if (campaign?.id) {
				router.push(
					`${urls.murmur.dashboard.index}?fromCampaignId=${campaign.id}&pick=1&allContacts=1&instant=1`
				);
			}
		} catch (error) {
			if (error instanceof CampaignApiError && error.code === 'CAMPAIGN_CAP_REACHED') {
				toast.error(error.message || CAP_REACHED_MESSAGE);
				return;
			}
			toast.error('Could not create campaign. Please try again.');
		}
	};

	return { addFolder, isAddingFolder };
};
