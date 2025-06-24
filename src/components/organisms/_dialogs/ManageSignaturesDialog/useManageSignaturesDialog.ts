import { zodResolver } from '@hookform/resolvers/zod';
import { MouseEvent, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
	useCreateSignature,
	useDeleteSignature,
	useEditSignature,
	useGetSignatures,
} from '@/hooks/queryHooks/useSignatures';
import { Signature } from '@prisma/client';
import { toast } from 'sonner';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { CampaignWithRelations } from '@/types';

const signatureSchema = z.object({
	name: z.string().min(1, { message: 'Signature name is required.' }),
	content: z.string(),
});

export interface ManageSignaturesDialogProps {
	campaign: CampaignWithRelations;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export const useManageSignaturesDialog = (props: ManageSignaturesDialogProps) => {
	const params = useParams();
	const { campaignId } = params as { campaignId: string };
	const [isEdit, setIsEdit] = useState(false);
	const [currentSignature, setCurrentSignature] = useState<Signature | null>(null);

	const { data: signatures, isPending: isPendingSignatures } = useGetSignatures();

	const { mutateAsync: saveSignature, isPending: isPendingSaveSignature } =
		useEditSignature({ suppressToasts: true });

	const { mutate: deleteSignature, isPending: isPendingDeleteSignature } =
		useDeleteSignature({});

	const { mutate: createSignature, isPending: isPendingCreateSignature } =
		useCreateSignature({ suppressToasts: true });

	const {
		mutateAsync: saveSignatureToCampaign,
		isPending: isPendingSaveSignatureToCampaign,
	} = useEditCampaign({
		suppressToasts: true,
		successMessage: 'Signature saved!',
	});

	const form = useForm<z.infer<typeof signatureSchema>>({
		resolver: zodResolver(signatureSchema),
		defaultValues: {
			name: '',
			content: '<p></p>',
		},
	});

	useEffect(() => {
		if (signatures?.length > 0) {
			const firstSignature = signatures[0];
			setCurrentSignature(firstSignature);
		}
	}, [signatures]);

	useEffect(() => {
		if (currentSignature) {
			form.reset({
				name: currentSignature.name,
				content: currentSignature.content,
			});
		}
	}, [currentSignature, form]);

	const handleSave = async (data: z.infer<typeof signatureSchema>) => {
		if (!currentSignature) {
			toast.error('No signature selected.');
			return;
		}
		await saveSignature({
			id: currentSignature.id,
			data,
		});
		toast.success('Signature saved!');
		queryClient.invalidateQueries({ queryKey: ['campaign', Number(campaignId)] });
	};

	const queryClient = useQueryClient();

	const handleSaveSignatureToCampaign = async (e: MouseEvent) => {
		e.preventDefault();
		if (!currentSignature) {
			toast.error('No signature selected.');
			return;
		}
		await saveSignature({
			id: currentSignature?.id,
			data: {
				name: form.getValues('name'),
				content: form.getValues('content'),
			},
		});
		await saveSignatureToCampaign({
			id: campaignId,
			data: {
				signatureId: currentSignature?.id,
			},
		});
		toast.success('Signature saved to campaign!');
		queryClient.invalidateQueries({ queryKey: ['campaign', Number(campaignId)] });
	};

	const handleRemoveSignatureFromCampaign = async (e: MouseEvent) => {
		e.preventDefault();
		await saveSignatureToCampaign({
			id: campaignId,
			data: {
				signatureId: null,
			},
		});
		toast.success('Signature removed from campaign!');
		queryClient.invalidateQueries({ queryKey: ['campaign', Number(campaignId)] });
	};
	return {
		signatures,
		isPendingSignatures,
		form,
		isEdit,
		setIsEdit,
		createSignature,
		deleteSignature,
		handleSave,
		currentSignature,
		setCurrentSignature,
		isPendingSaveSignature,
		isPendingDeleteSignature,
		isPendingCreateSignature,
		saveSignatureToCampaign,
		isPendingSaveSignatureToCampaign,
		campaignId,
		handleSaveSignatureToCampaign,
		handleRemoveSignatureFromCampaign,
		open: props.open,
		onOpenChange: props.onOpenChange,
		...props,
	};
};
