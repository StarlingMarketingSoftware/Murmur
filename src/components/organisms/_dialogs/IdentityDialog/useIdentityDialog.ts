import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useGetIdentities } from '@/hooks/queryHooks/useIdentities';
import { zodResolver } from '@hookform/resolvers/zod';
import { Campaign } from '@prisma/client';
import { ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export interface IdentityDialogProps {
	title: string;
	open?: boolean;
	onClose?: () => void;
	isLoading?: boolean;
	triggerButton?: ReactNode;
	onOpenChange: (open: boolean) => void;
	campaign: Campaign;
}

const identityFormSchema = z.object({
	identityId: z.string(),
});

export const useIdentityDialog = (props: IdentityDialogProps) => {
	const { title, onOpenChange, triggerButton, isLoading, campaign } = props;

	const [internalOpen, setInternalOpen] = useState(false);
	const [showCreatePanel, setShowCreatePanel] = useState(false);
	const [isEdit, setIsEdit] = useState(false);
	const isClosable = !!campaign.identityId;
	const isControlled = props.open !== undefined;
	const open = isControlled ? props.open : internalOpen;

	const form = useForm<z.infer<typeof identityFormSchema>>({
		mode: 'onTouched',
		resolver: zodResolver(identityFormSchema),
		defaultValues: {
			identityId: campaign.identityId ? String(campaign.identityId) : '',
		},
	});

	const { data: identities, isPending: isPendingIdentities } = useGetIdentities({});

	const { mutate: assignIdentity, isPending: isPendingAssignIdentity } = useEditCampaign({
		onSuccess: () => {
			onOpenChange(false);
		},
	});

	const selectedIdentity = identities?.find(
		(identity) => identity.id === Number(form.watch('identityId'))
	);

	const handleOpenChange = (newOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(newOpen);
		}
		props.onOpenChange?.(newOpen);
		if (!newOpen) {
			props.onClose?.();
		}
	};

	const handleAssignIdentity = () => {
		if (selectedIdentity) {
			assignIdentity({
				id: campaign.id,
				data: {
					identityId: selectedIdentity.id,
				},
			});
		} else {
			toast.error('Please select an identity to assign.');
		}
	};

	return {
		title,
		form,
		isPendingIdentities,
		identities,
		onOpenChange,
		triggerButton,
		isLoading,
		open,
		handleOpenChange,
		showCreatePanel,
		setShowCreatePanel,
		isEdit,
		setIsEdit,
		selectedIdentity,
		isClosable,
		handleAssignIdentity,
		isPendingAssignIdentity,
	};
};
