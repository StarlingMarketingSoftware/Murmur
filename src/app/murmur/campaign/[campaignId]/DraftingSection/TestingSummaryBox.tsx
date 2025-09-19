'use client';

import { FC, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { DraftingFormValues } from './useDraftingSection';
import { CampaignWithRelations } from '@/types';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus } from '@/constants/prismaEnums';
import { cn } from '@/utils';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { MiniEmailStructure } from './EmailGeneration/MiniEmailStructure';
import { ContactsSelection } from './EmailGeneration/ContactsSelection/ContactsSelection';
import { DraftedEmails } from './EmailGeneration/DraftedEmails/DraftedEmails';
import { SentEmails } from './EmailGeneration/SentEmails/SentEmails';

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
	onClick?: () => void;
}> = ({ label, right, className, children, onClick }) => {
	return (
		<div
			className={cn(
				'w-full rounded-[8px] border-2 border-black px-3 py-[6px] bg-white flex items-center justify-between',
				className,
				onClick ? 'cursor-pointer' : ''
			)}
			onClick={onClick}
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
	const [openPanel, setOpenPanel] = useState<
		'contacts' | 'structure' | 'drafts' | 'sent' | null
	>(null);

	const { data: emails } = useGetEmails({ filters: { campaignId: campaign.id } });
	const { data: contacts = [] } = useGetContacts({
		filters: { contactListIds: campaign.userContactLists.map((l) => l.id) },
	});

	const draftEmails = useMemo(
		() => (emails || []).filter((e) => e.status === EmailStatus.draft),
		[emails]
	);
	const sentEmails = useMemo(
		() => (emails || []).filter((e) => e.status === EmailStatus.sent),
		[emails]
	);
	const draftCount = draftEmails.length;
	const sentCount = sentEmails.length;
	const availableContacts = useMemo(() => {
		const draftedIds = new Set(draftEmails.map((d) => d.contactId));
		return contacts.filter((c) => !draftedIds.has(c.id));
	}, [contacts, draftEmails]);

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
						onClick={() => setOpenPanel(openPanel === 'contacts' ? null : 'contacts')}
					/>

					{openPanel === 'contacts' && (
						<div className="pt-1 pb-2 flex justify-center">
							<ContactsSelection
								contacts={availableContacts}
								selectedContactIds={new Set()}
								setSelectedContactIds={() => {}}
								handleContactSelection={() => {}}
							/>
						</div>
					)}

					<Row
						label="Email Structure"
						className="bg-[#E4EEFF] cursor-pointer"
						onClick={() => setOpenPanel(openPanel === 'structure' ? null : 'structure')}
					>
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

					{openPanel === 'structure' && (
						<div className="pt-1 pb-2 flex justify-center">
							<MiniEmailStructure
								form={form}
								onDraft={() => {}}
								isDraftDisabled={true}
								isPendingGeneration={false}
							/>
						</div>
					)}

					<Row
						label="Drafts"
						right={`${draftCount} drafts`}
						className="bg-[#FFECC6] cursor-pointer"
						onClick={() => setOpenPanel(openPanel === 'drafts' ? null : 'drafts')}
					/>

					{openPanel === 'drafts' && (
						<div className="pt-1 pb-2 flex justify-center">
							<DraftedEmails
								draftEmails={draftEmails}
								isPendingEmails={false}
								contacts={contacts}
								selectedDraftIds={new Set()}
								setSelectedDraft={() => {}}
								setIsDraftDialogOpen={() => {}}
								handleDraftSelection={() => {}}
								setSelectedDraftIds={() => {}}
								onSend={() => {}}
								isSendingDisabled={true}
								isFreeTrial={false}
								fromName={campaign?.identity?.name}
								fromEmail={campaign?.identity?.email}
								subject={form.watch('subject')}
								selectedDraft={null}
							/>
						</div>
					)}

					<Row
						label="Sent"
						right={`${sentCount} sent`}
						className="bg-[#DFF6E3] cursor-pointer"
						onClick={() => setOpenPanel(openPanel === 'sent' ? null : 'sent')}
					/>

					{openPanel === 'sent' && (
						<div className="pt-1 pb-2 flex justify-center">
							<SentEmails emails={sentEmails} isPendingEmails={false} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default TestingSummaryBox;
