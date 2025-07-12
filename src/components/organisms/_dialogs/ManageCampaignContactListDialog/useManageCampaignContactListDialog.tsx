import { useState } from 'react';
import { CampaignWithRelations } from '@/types';
import { UserContactList } from '@prisma/client';
import { useGetUserContactLists } from '@/hooks/queryHooks/useUserContactLists';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { toast } from 'sonner';

export interface ManageCampaignContactListDialogProps {
	campaign: CampaignWithRelations;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export const useManageCampaignContactListDialog = (
	props: ManageCampaignContactListDialogProps
) => {
	const { campaign, open, onOpenChange } = props;
	const [searchQuery, setSearchQuery] = useState('');
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [selectedEditContactList, setSelectedEditContactList] =
		useState<UserContactList | null>(null);

	// Get all user contact lists
	const { data: allUserContactLists, isPending: isPendingUserContactLists } =
		useGetUserContactLists();

	// Get campaign's current contact lists
	const campaignContactListIds = campaign.userContactLists?.map((list) => list.id) || [];

	// Filter available contact lists (not already in campaign)
	const availableContactLists =
		allUserContactLists?.filter(
			(list: UserContactList) =>
				!campaignContactListIds.includes(list.id) &&
				list.name.toLowerCase().includes(searchQuery.toLowerCase())
		) || [];

	// Current campaign contact lists
	const campaignContactLists = campaign.userContactLists || [];

	// Edit campaign mutation
	const { mutate: editCampaign, isPending: isPendingEditCampaign } = useEditCampaign({
		suppressToasts: true,
		onSuccess: () => {
			toast.success('Contact lists updated successfully!');
		},
	});

	// Add contact list to campaign
	const handleAddContactList = (contactList: UserContactList) => {
		editCampaign({
			id: campaign.id,
			data: {
				userContactListOperation: {
					action: 'connect',
					userContactListIds: [contactList.id],
				},
			},
		});
	};

	// Remove contact list from campaign
	const handleRemoveContactList = (contactList: UserContactList) => {
		editCampaign({
			id: campaign.id,
			data: {
				userContactListOperation: {
					action: 'disconnect',
					userContactListIds: [contactList.id],
				},
			},
		});
	};

	// Open edit dialog for a contact list
	const handleEditContactList = (contactList: UserContactList) => {
		setSelectedEditContactList(contactList);
		setIsEditDialogOpen(true);
	};

	return {
		campaign,
		searchQuery,
		setSearchQuery,
		availableContactLists,
		campaignContactLists,
		isPendingUserContactLists,
		isPendingEditCampaign,
		handleAddContactList,
		handleRemoveContactList,
		handleEditContactList,
		isEditDialogOpen,
		setIsEditDialogOpen,
		selectedEditContactList,
		open,
		onOpenChange,
	};
};
