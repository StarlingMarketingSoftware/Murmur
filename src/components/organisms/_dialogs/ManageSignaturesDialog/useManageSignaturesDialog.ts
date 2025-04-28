import { zodResolver } from '@hookform/resolvers/zod';
import { MouseEvent, useEffect, useState } from 'react';
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

const signatureSchema = z.object({
	name: z.string().min(1, { message: 'Signature name is required.' }),
	content: z.string(),
});

export const useManageSignaturesDialog = () => {
	const params = useParams();
	const { campaignId } = params as { campaignId: string };

	const [isEdit, setIsEdit] = useState(false);
	const [currentSignature, setCurrentSignature] = useState<Signature | null>(null);

	const { data: signatures, isPending: isPendingSignatures } = useGetUserSignatures();
	const { mutateAsync: saveSignature, isPending: isPendingSaveSignature } =
		useEditSignature({});
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

	const handleSave = async (data: z.infer<typeof signatureSchema>) => {
		if (!currentSignature) {
			toast.error('No signature selected.');
			return;
		}
		await saveSignature({
			signatureId: currentSignature.id,
			data,
		});
		queryClient.invalidateQueries({ queryKey: ['campaign', campaignId.toString()] });
	};

	const queryClient = useQueryClient();
	const handleSaveSignatureToCampaign = async (e: MouseEvent) => {
		e.preventDefault();
		if (!currentSignature) {
			toast.error('No signature selected.');
			return;
		}
		await saveSignature({
			signatureId: currentSignature?.id,
			data: {
				name: form.getValues('name'),
				content: form.getValues('content'),
			},
		});
		await saveSignatureToCampaign({
			campaignId: parseInt(campaignId),
			data: {
				signatureId: currentSignature?.id,
			},
		});
		queryClient.invalidateQueries({ queryKey: ['campaign', campaignId.toString()] });
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
	};
};
