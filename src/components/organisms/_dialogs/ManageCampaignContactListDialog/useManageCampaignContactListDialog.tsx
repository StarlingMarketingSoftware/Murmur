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

	const { data: allUserContactLists, isPending: isPendingUserContactLists } =
		useGetUserContactLists();

	const campaignContactListIds = campaign.userContactLists?.map((list) => list.id) || [];

	const availableContactLists =
		allUserContactLists?.filter(
			(list: UserContactList) =>
				!campaignContactListIds.includes(list.id) &&
				list.name.toLowerCase().includes(searchQuery.toLowerCase())
		) || [];

	const campaignContactLists = campaign.userContactLists || [];

	const { mutate: editCampaign, isPending: isPendingEditCampaign } = useEditCampaign({
		suppressToasts: true,
		onSuccess: () => {
			toast.success('Contact lists updated successfully!');
		},
	});

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
