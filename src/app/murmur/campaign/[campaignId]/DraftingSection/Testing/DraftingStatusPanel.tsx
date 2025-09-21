import { FC, ReactNode, useMemo, useState } from 'react';
import { cn } from '@/utils';
import { CampaignWithRelations } from '@/types/campaign';
import { ContactWithName } from '@/types/contact';
import { UseFormReturn } from 'react-hook-form';
import { DraftingFormValues } from '../useDraftingSection';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus } from '@/constants/prismaEnums';
import { Expand } from 'lucide-react';

export type DraftingPreviewKind =
	| 'none'
	| 'contacts'
	| 'emailStructure'
	| 'draftPreview'
	| 'drafts'
	| 'sendPreview'
	| 'sent';

export interface DraftingStatusPanelRenderers {
	contacts?: () => ReactNode;
	emailStructure?: () => ReactNode;
	draftPreview?: () => ReactNode;
	drafts?: () => ReactNode;
	sendPreview?: () => ReactNode;
	sent?: () => ReactNode;
}

export interface DraftingStatusPanelProps {
	campaign: CampaignWithRelations;
	contacts: ContactWithName[];
	form: UseFormReturn<DraftingFormValues>;
	generationProgress: number; // -1 when idle
	generationTotal?: number; // 0 when unknown
	renderers?: DraftingStatusPanelRenderers; // Custom UI hooks for previews
}

const Divider = () => <div className="w-px self-stretch border-l border-black/40" />;

export const DraftingStatusPanel: FC<DraftingStatusPanelProps> = (props) => {
	const {
		campaign,
		contacts,
		form,
		generationProgress,
		generationTotal = 0,
		renderers,
	} = props;

	const [isOpen, setIsOpen] = useState(true);
	const [activePreview, setActivePreview] = useState<DraftingPreviewKind>('none');

	const { data: emails } = useGetEmails({
		filters: { campaignId: campaign.id },
	});

	const draftedEmails = useMemo(
		() => (emails || []).filter((e) => e.status === EmailStatus.draft),
		[emails]
	);
	const sentEmails = useMemo(
		() => (emails || []).filter((e) => e.status === EmailStatus.sent),
		[emails]
	);

	const contactsCount = contacts?.length || 0;
	const draftsCount = draftedEmails.length;
	const sentCount = sentEmails.length;

	const isDrafting =
		generationProgress >= 0 &&
		generationTotal > 0 &&
		generationProgress < generationTotal;
	const draftingPct = useMemo(() => {
		if (!isDrafting) return 0;
		const pct = Math.round((generationProgress / Math.max(1, generationTotal)) * 100);
		return Math.max(0, Math.min(100, pct));
	}, [generationProgress, generationTotal, isDrafting]);

	// Email structure quick facts
	const hybridBlocks = form.watch('hybridBlockPrompts');
	const hasFullAutomated = Boolean(
		hybridBlocks?.some((b) => b.type === 'full_automated')
	);
	const isOnlyTextBlocks = Boolean(
		hybridBlocks &&
			hybridBlocks.length > 0 &&
			hybridBlocks.every((b) => b.type === 'text')
	);
	const draftingMode: 'Full Auto' | 'Hybrid' | 'Handwritten' = hasFullAutomated
		? 'Full Auto'
		: isOnlyTextBlocks
		? 'Handwritten'
		: 'Hybrid';

	const draftingModeStyle = useMemo(() => {
		switch (draftingMode) {
			case 'Full Auto':
				return { backgroundColor: '#DAE6FE' };
			case 'Hybrid':
				return { backgroundColor: 'rgba(74, 74, 217, 0.31)' };
			case 'Handwritten':
				return { backgroundColor: 'rgba(93, 171, 104, 0.47)' };
			default:
				return {};
		}
	}, [draftingMode]);

	const isAiSubject = form.watch('isAiSubject');
	const subjectStyle = useMemo(() => {
		return {
			backgroundColor: isAiSubject ? '#B3D8B8' : '#F1F1F1',
		};
	}, [isAiSubject]);
	const subject = form.watch('subject');
	const fromName = campaign.identity?.name || '';

	const headerRight = (
		<div className="flex items-center gap-2">
			<button
				type="button"
				className="text-sm font-semibold text-black/70 hover:text-black flex items-center gap-1"
				onClick={() => setIsOpen((v) => !v)}
			>
				{isOpen ? 'Open' : 'Closed'}
				<Expand size={14} />
			</button>
		</div>
	);

	const renderActivePreview = (): ReactNode => {
		if (activePreview === 'none') return null;
		const container = (content: ReactNode) => (
			<div className="mt-2 rounded-md border border-black/20 bg-white/80 shadow-[0_2px_0_#000] p-3 font-sans">
				{content}
			</div>
		);

		switch (activePreview) {
			case 'contacts':
				return container(
					renderers?.contacts ? (
						renderers.contacts()
					) : (
						<div className="space-y-2">
							{contacts.slice(0, 8).map((c) => (
								<div key={c.id} className="flex items-center gap-3">
									<div className="h-4 w-4 rounded-full border border-black/30" />
									<div className="text-[13px] font-medium">
										{c.firstName} {c.lastName}
									</div>
									<div className="ml-auto text-xs text-black/60">Music Venue</div>
								</div>
							))}
						</div>
					)
				);
			case 'emailStructure':
				return container(
					renderers?.emailStructure ? (
						renderers.emailStructure()
					) : (
						<div className="flex items-center gap-2 flex-wrap text-sm">
							<span>{draftingMode}</span>
							<Divider />
							<span>{isAiSubject ? 'Auto Subject' : 'Custom Subject'}</span>
							<Divider />
							<span>{fromName || 'From Name'}</span>
						</div>
					)
				);
			case 'draftPreview':
				return container(
					renderers?.draftPreview ? (
						renderers.draftPreview()
					) : (
						<div className="flex items-center gap-2 overflow-hidden text-sm">
							<span className="truncate max-w-[160px]">
								{contacts?.[0]?.firstName || 'Contact'}
							</span>
							<span className="truncate max-w-[270px]">
								{subject || 'Subject preview'}
							</span>
						</div>
					)
				);
			case 'drafts':
				return container(
					renderers?.drafts ? (
						renderers.drafts()
					) : (
						<div className="text-[13px]">{draftsCount} drafts ready</div>
					)
				);
			case 'sendPreview':
				return container(
					renderers?.sendPreview ? (
						renderers.sendPreview()
					) : (
						<div className="flex items-center gap-2 overflow-hidden text-sm">
							<span className="truncate max-w-[160px]">
								{draftedEmails?.[0]?.contact?.firstName ||
									contacts?.[0]?.firstName ||
									'Contact'}
							</span>
							<span className="truncate max-w-[270px]">
								{draftedEmails?.[0]?.subject || subject || 'Subject preview'}
							</span>
						</div>
					)
				);
			case 'sent':
				return container(
					renderers?.sent ? (
						renderers.sent()
					) : (
						<div className="text-[13px]">
							{sentCount.toString().padStart(2, '0')} sent
						</div>
					)
				);
			default:
				return null;
		}
	};

	return (
		<div
			className={cn(
				'fixed right-6 top-[160px] z-50 w-[400px] rounded-lg border border-black bg-[#EEF2F6] backdrop-blur-md',
				'overflow-visible font-serif'
			)}
		>
			<div className="h-[31px] bg-white rounded-t-lg px-3 flex items-center">
				<div className="text-xl font-bold">Drafting</div>
				<div className="ml-auto">{headerRight}</div>
			</div>

			{isOpen && (
				<div className="p-3">
					{/* Contacts */}
					<div
						className={cn(
							'rounded-md border-2 border-black/30 mb-2 font-sans',
							'bg-[#F5DADA] backdrop-blur-sm select-none transition-all'
						)}
						style={{ width: '376px' }}
					>
						<div
							className="flex items-center pl-3 pr-0 cursor-pointer hover:bg-black/5"
							style={{ height: '28px' }}
							onClick={() => setActivePreview('contacts')}
						>
							<span className="font-bold text-black text-sm">Contacts</span>
							<div className="ml-auto flex items-center gap-2 text-[11px] text-black/70 font-medium h-full pr-2">
								<span>{`${contactsCount} people`}</span>
								<Divider />
								<button
									type="button"
									className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
									onClick={(e) => {
										e.stopPropagation();
										setActivePreview('contacts');
									}}
								>
									Select
								</button>
								<Divider />
								<button
									type="button"
									className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
									onClick={(e) => {
										e.stopPropagation();
										setActivePreview('draftPreview');
									}}
								>
									Draft
								</button>
							</div>
							<div className="self-stretch flex items-center justify-center text-sm font-bold text-black/80 w-[30px] flex-shrink-0 border-l border-black/40">
								1
							</div>
						</div>
						{isDrafting && (
							<div className="px-2 pb-2">
								<div className="mt-1">
									<div className="text-[10px] mb-0.5">Drafting</div>
									<div className="h-1.5 w-full rounded-sm border border-black/20 bg-white">
										<div
											className="h-full bg-[#B5E2B5]"
											style={{ width: `${draftingPct}%` }}
										/>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Email Structure */}
					<div
						className="flex items-stretch rounded-lg border-2 border-black w-[376px] h-[32px] font-sans text-xs cursor-pointer overflow-hidden mb-2"
						onClick={() => setActivePreview('emailStructure')}
					>
						<div className="px-3 text-sm font-bold text-black bg-white flex items-center border-r border-black/40">
							<span className="whitespace-nowrap">Email Structure</span>
						</div>
						<div
							className="px-3 flex items-center border-r border-black/40 font-medium text-black/80 text-[11px]"
							style={draftingModeStyle}
						>
							<span className="whitespace-nowrap">{draftingMode}</span>
						</div>
						<div
							className="px-3 flex items-center border-r border-black/40 font-medium text-black/80 text-[11px]"
							style={subjectStyle}
						>
							<span className="whitespace-nowrap">
								{isAiSubject ? 'Auto Subject' : 'Subject'}
							</span>
						</div>
						<div className="px-3 bg-[#E0E0E0] flex items-center flex-grow font-medium text-black/80 text-[11px] min-w-0">
							<span className="truncate">{fromName || 'From'}</span>
						</div>
						<div className="bg-white flex items-center justify-center text-sm font-bold text-black/80 w-[30px] flex-shrink-0 border-l border-black/40">
							2
						</div>
					</div>

					{/* Drafts */}
					<div
						className={cn(
							'rounded-md border-2 border-black/30 mb-2 font-sans',
							'bg-[#F4E5BC] backdrop-blur-sm select-none transition-all'
						)}
						style={{ width: '376px' }}
					>
						<div
							className="flex items-center pl-3 pr-0 cursor-pointer hover:bg-black/5"
							style={{ height: '28px' }}
							onClick={() => setActivePreview('drafts')}
						>
							<span className="font-bold text-black text-sm">Drafts</span>
							<div className="ml-auto flex items-center gap-2 text-[11px] text-black/70 font-medium h-full pr-2">
								<span>{`${draftsCount} drafts`}</span>
								<Divider />
								<button
									type="button"
									className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
									onClick={(e) => {
										e.stopPropagation();
										setActivePreview('drafts');
									}}
								>
									Select
								</button>
								<Divider />
								<button
									type="button"
									className="bg-transparent border-none p-0 hover:text-black text-[11px] font-medium"
									onClick={(e) => {
										e.stopPropagation();
										setActivePreview('sendPreview');
									}}
								>
									Send
								</button>
							</div>
							<div className="self-stretch flex items-center justify-center text-sm font-bold text-black/80 w-[30px] flex-shrink-0 border-l border-black/40">
								3
							</div>
						</div>
					</div>

					{/* Sent */}
					<div
						className={cn(
							'rounded-md border-2 border-black/30 mb-2 font-sans',
							'bg-[#CFEBCF] backdrop-blur-sm select-none transition-all'
						)}
						style={{ width: '376px' }}
					>
						<div
							className="flex items-center pl-3 pr-0 cursor-pointer hover:bg-black/5"
							style={{ height: '28px' }}
							onClick={() => setActivePreview('sent')}
						>
							<span className="font-bold text-black text-sm">Sent</span>
							<div className="ml-auto flex items-center gap-2 text-[11px] text-black/70 font-medium h-full pr-2">
								<span>{`${sentCount.toString().padStart(2, '0')} sent`}</span>
							</div>
							<div className="self-stretch flex items-center justify-center text-sm font-bold text-black/80 w-[30px] flex-shrink-0 border-l border-black/40">
								4
							</div>
						</div>
					</div>

					{renderActivePreview()}
				</div>
			)}
		</div>
	);
};

export default DraftingStatusPanel;
