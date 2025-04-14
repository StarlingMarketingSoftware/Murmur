import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
	useCreateSignature,
	useDeleteSignature,
	useEditSignature,
	useGetUserSignatures,
} from '@/hooks/useSignatures';
import { Signature } from '@prisma/client';
import { toast } from 'sonner';
import { useEditCampaign } from '@/hooks/useCampaigns';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

export interface ManageSignaturesDialogProps {}

const signatureSchema = z.object({
	name: z.string().min(1, { message: 'Signature name is required.' }),
	content: z.string(),
});

export const useManageSignaturesDialog = (props: ManageSignaturesDialogProps) => {
	const params = useParams();
	const { campaignId } = params as { campaignId: string };

	const [isEdit, setIsEdit] = useState(false);
	const [currentSignature, setCurrentSignature] = useState<Signature | null>(null);

	const { data: signatures, isPending: isPendingSignatures } = useGetUserSignatures();
	const { mutate: saveSignature, isPending: isPendingSaveSignature } = useEditSignature(
		{}
	);
	const { mutate: deleteSignature, isPending: isPendingDeleteSignature } =
		useDeleteSignature({});
	const { mutate: createSignature, isPending: isPendingCreateSignature } =
		useCreateSignature({});
	const {
		mutateAsync: saveSignatureToCampaign,
		isPending: isPendingSaveSignatureToCampaign,
	} = useEditCampaign({
		successMessage: 'Signature saved to campaign.',
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

	const handleSave = (data: z.infer<typeof signatureSchema>) => {
		if (!currentSignature) {
			toast.error('No signature selected.');
			return;
		}
		saveSignature({
			signatureId: currentSignature.id,
			data,
		});
	};

	const queryClient = useQueryClient();
	const handleSaveSignatureToCampaign = async (e) => {
		e.preventDefault();
		await saveSignatureToCampaign({
			campaignId: parseInt(campaignId),
			data: {
				signatureId: currentSignature?.id,
			},
		});
		// Invalidate both the campaigns list and the specific campaign
		queryClient.invalidateQueries({ queryKey: ['campaigns'] });
		queryClient.invalidateQueries({ queryKey: ['campaign', parseInt(campaignId)] });
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
		...props,
	};
};
