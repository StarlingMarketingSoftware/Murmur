import { FC, ReactNode, useMemo, useState } from 'react';
import { cn } from '@/utils';
import { CampaignWithRelations } from '@/types/campaign';
import { ContactWithName } from '@/types/contact';
import { UseFormReturn } from 'react-hook-form';
import { DraftingFormValues } from '../useDraftingSection';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus } from '@/constants/prismaEnums';

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

const ArrowIcon = () => (
	<svg
		width="7"
		height="12"
		viewBox="0 0 7 12"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M6.53033 6.53033C6.82322 6.23744 6.82322 5.76256 6.53033 5.46967L1.75736 0.696699C1.46447 0.403806 0.989593 0.403806 0.696699 0.696699C0.403806 0.989593 0.403806 1.46447 0.696699 1.75736L4.93934 6L0.696699 10.2426C0.403806 10.5355 0.403806 11.0104 0.696699 11.3033C0.989593 11.5962 1.46447 11.5962 1.75736 11.3033L6.53033 6.53033ZM5 6V6.75H6V6V5.25H5V6Z"
			fill="#636363"
			fillOpacity="0.46"
		/>
	</svg>
);

const ExpandIcon = () => (
	<svg
		className="inline-block align-middle"
		width="14"
		height="14"
		viewBox="0 0 15 15"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M14.4047 1.00117C14.4047 0.780258 14.2256 0.601172 14.0047 0.601172L10.4047 0.601172C10.1838 0.601172 10.0047 0.780258 10.0047 1.00117C10.0047 1.22209 10.1838 1.40117 10.4047 1.40117L13.6047 1.40117L13.6047 4.60117C13.6047 4.82209 13.7838 5.00117 14.0047 5.00117C14.2256 5.00117 14.4047 4.82209 14.4047 4.60117L14.4047 1.00117ZM8.80469 6.20117L9.08753 6.48401L14.2875 1.28401L14.0047 1.00117L13.7218 0.718329L8.52184 5.91833L8.80469 6.20117Z"
			fill="currentColor"
		/>
		<path
			d="M14.0047 14.4013C14.2256 14.4013 14.4047 14.2222 14.4047 14.0013L14.4047 10.4013C14.4047 10.1804 14.2256 10.0013 14.0047 10.0013C13.7838 10.0013 13.6047 10.1804 13.6047 10.4013L13.6047 13.6013L10.4047 13.6013C10.1838 13.6013 10.0047 13.7804 10.0047 14.0013C10.0047 14.2222 10.1838 14.4013 10.4047 14.4013L14.0047 14.4013ZM8.80469 8.80127L8.52184 9.08411L13.7218 14.2841L14.0047 14.0013L14.2875 13.7184L9.08753 8.51843L8.80469 8.80127Z"
			fill="currentColor"
		/>
		<path
			d="M0.603125 14.0013C0.603125 14.2222 0.782211 14.4013 1.00312 14.4013L4.60312 14.4013C4.82404 14.4013 5.00312 14.2222 5.00312 14.0013C5.00312 13.7804 4.82404 13.6013 4.60312 13.6013L1.40312 13.6013L1.40312 10.4013C1.40312 10.1804 1.22404 10.0013 1.00312 10.0013C0.782211 10.0013 0.603125 10.1804 0.603125 10.4013L0.603125 14.0013ZM6.20312 8.80127L5.92028 8.51843L0.720282 13.7184L1.00312 14.0013L1.28597 14.2841L6.48597 9.08411L6.20312 8.80127Z"
			fill="currentColor"
		/>
		<path
			d="M1.00313 0.601172C0.782211 0.601172 0.603125 0.780258 0.603125 1.00117V4.60117C0.603125 4.82209 0.782211 5.00117 1.00313 5.00117C1.22404 5.00117 1.40313 4.82209 1.40313 4.60117V1.40117H4.60313C4.82404 1.40117 5.00313 1.22209 5.00313 1.00117C5.00313 0.780258 4.82404 0.601172 4.60313 0.601172H1.00313ZM6.20312 6.20117L6.48597 5.91833L1.28597 0.718329L1.00313 1.00117L0.720282 1.28401L5.92028 6.48401L6.20312 6.20117Z"
			fill="currentColor"
		/>
	</svg>
);

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
				<ExpandIcon />
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
				'overflow-visible font-inter'
			)}
		>
			<div className="h-[31px] bg-white rounded-t-lg px-3 flex items-center">
				<div className="text-[14px] font-inter font-medium">Drafting</div>
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
								<span>{`${String(contactsCount).padStart(2, '0')} ${
									contactsCount === 1 ? 'person' : 'people'
								}`}</span>
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
							<div className="self-stretch flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 border-l border-black/40 pl-2">
								<span className="w-[20px] text-center">1</span>
								<ArrowIcon />
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
						<div className="bg-white flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 border-l border-black/40 pl-2">
							<span className="w-[20px] text-center">2</span>
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
							<div className="self-stretch flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 border-l border-black/40 pl-2">
								<span className="w-[20px] text-center">3</span>
								<ArrowIcon />
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
							<div className="flex-1 flex items-center justify-center text-[11px] text-black/70 font-medium h-full">
								<span>{`${sentCount.toString().padStart(2, '0')} sent`}</span>
							</div>
							<div className="self-stretch flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 border-l border-black/40 pl-2">
								<span className="w-[20px] text-center">4</span>
								<ArrowIcon />
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
