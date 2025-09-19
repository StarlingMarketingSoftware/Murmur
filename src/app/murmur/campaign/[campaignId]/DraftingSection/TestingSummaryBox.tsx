'use client';

import { FC, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { DraftingFormValues } from './useDraftingSection';
import { CampaignWithRelations } from '@/types';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus } from '@/constants/prismaEnums';
import { cn } from '@/utils';

interface TestingSummaryBoxProps {
	campaign: CampaignWithRelations;
	contactsCount: number;
	form: UseFormReturn<DraftingFormValues>;
}

const Row: FC<{
	label: string;
	right?: string;
	className?: string;
	children?: React.ReactNode;
}> = ({ label, right, className, children }) => {
	return (
		<div
			className={cn(
				'w-full rounded-[8px] border-2 border-black px-3 py-[6px] bg-white flex items-center justify-between',
				className
			)}
		>
			<div className="flex items-center gap-3 min-w-0">
				<div className="font-inter font-semibold text-[14px] text-black whitespace-nowrap">
					{label}
				</div>
				{children}
			</div>
			{right ? (
				<div className="font-inter text-[12px] text-black whitespace-nowrap ml-3">
					{right}
				</div>
			) : null}
		</div>
	);
};

export const TestingSummaryBox: FC<TestingSummaryBoxProps> = ({
	campaign,
	contactsCount,
	form,
}) => {
	const { data: emails } = useGetEmails({ filters: { campaignId: campaign.id } });

	const draftCount = useMemo(
		() => (emails || []).filter((e) => e.status === EmailStatus.draft).length,
		[emails]
	);
	const sentCount = useMemo(
		() => (emails || []).filter((e) => e.status === EmailStatus.sent).length,
		[emails]
	);

	const hybridBlocks = form.watch('hybridBlockPrompts');
	const isAiSubject = form.watch('isAiSubject');
	const subject = form.watch('subject');

	const modeLabel = useMemo(() => {
		const blocks = hybridBlocks || [];
		const hasFullAutomated = blocks.some((b) => b.type === 'full_automated');
		if (hasFullAutomated) return 'Full Auto';
		const isOnlyText = blocks.length > 0 && blocks.every((b) => b.type === 'text');
		if (isOnlyText) return 'Manual';
		return 'Hybrid';
	}, [hybridBlocks]);

	return (
		<div className="w-[420px] flex-shrink-0">
			<div className="rounded-[10px] border-[3px] border-black bg-white overflow-hidden">
				<div className="px-4 py-2 flex items-center justify-between">
					<div className="font-inter text-[18px] font-semibold">Drafting</div>
					<div className="font-inter text-[12px] text-[#6B6B6B]">Open</div>
				</div>
				<div className="px-3 pb-3 flex flex-col gap-2">
					<Row
						label="Contacts"
						right={`${contactsCount} ${contactsCount === 1 ? 'person' : 'people'}`}
						className="bg-[#FCE2E2]"
					/>

					<Row label="Email Structure" className="bg-[#E4EEFF]">
						<div className="flex items-center gap-2 text-[11px] font-inter">
							<span className="px-2 py-[2px] rounded-[6px] border border-black bg-white">
								{modeLabel}
							</span>
							<span className="px-2 py-[2px] rounded-[6px] border border-black bg-white">
								{isAiSubject ? 'Auto Subject' : 'Subject'}
							</span>
							{!isAiSubject && subject ? (
								<span className="truncate max-w-[140px] text-[#4B4B4B]">{subject}</span>
							) : null}
						</div>
					</Row>

					<Row label="Drafts" right={`${draftCount} drafts`} className="bg-[#FFECC6]" />

					<Row label="Sent" right={`${sentCount} sent`} className="bg-[#DFF6E3]" />
				</div>
			</div>
		</div>
	);
};

export default TestingSummaryBox;
