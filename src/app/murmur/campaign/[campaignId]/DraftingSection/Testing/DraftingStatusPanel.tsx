import { FC, ReactNode, useMemo, useState } from 'react';
import { cn } from '@/utils';
import { CampaignWithRelations } from '@/types/campaign';
import { ContactWithName } from '@/types/contact';
import { UseFormReturn } from 'react-hook-form';
import { DraftingFormValues } from '../useDraftingSection';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { EmailStatus } from '@/constants/prismaEnums';
import { ArrowUpRight, ChevronsRight, Expand } from 'lucide-react';

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

const SectionShell: FC<{
	label: string;
	accentClass: string;
	rightNode?: ReactNode;
	onClick?: () => void;
	children?: ReactNode;
	number?: ReactNode;
}> = ({ label, accentClass, rightNode, onClick, children, number }) => {
	return (
		<div
			className={cn(
				'rounded-md border-b-2 border-l border-r border-t border-black/30 shadow-[0_2px_0_#000] mb-2',
				'bg-white/70 backdrop-blur-sm select-none transition-all',
				onClick && 'cursor-pointer hover:bg-white/90'
			)}
			onClick={onClick}
			style={{ width: '376px' }}
		>
			<div className="flex items-center gap-2 px-2" style={{ height: '28px' }}>
				<div
					className={cn(
						'h-5 w-28 rounded-sm text-center text-xs leading-5 font-bold text-black/90',
						accentClass
					)}
				>
					{label}
				</div>
				<div className="ml-auto flex items-center gap-2 text-xs">{rightNode}</div>
				{number && (
					<div className="flex items-center justify-center text-xs font-bold text-black/60 w-5">
						{number}
					</div>
				)}
			</div>
			{children && <div className="px-2 pb-2">{children}</div>}
		</div>
	);
};

const Pill: FC<{ children: ReactNode; className?: string }> = ({
	children,
	className,
}) => (
	<div
		className={cn(
			'px-1.5 h-5 rounded-sm border border-black/20 shadow-[0_1px_0_#000] text-[11px] leading-5 bg-white/70',
			className
		)}
	>
		{children}
	</div>
);

const CountPill: FC<{ label: string }> = ({ label }) => (
	<Pill className="min-w-[70px] text-center font-medium">{label}</Pill>
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
	const isAiSubject = form.watch('isAiSubject');
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
			<div className="mt-2 rounded-md border border-black/20 bg-white/80 shadow-[0_2px_0_#000] p-3">
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
									<div className="ml-auto">
										<Pill>Music Venue</Pill>
									</div>
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
						<div className="flex items-center gap-2 flex-wrap">
							<Pill className="bg-[#DBDBFF] font-semibold">{draftingMode}</Pill>
							<Pill className="bg-[#DBFFDB] font-semibold">
								{isAiSubject ? 'Auto Subject' : 'Subject'}
							</Pill>
							<Pill className="font-semibold">{fromName || 'From'}</Pill>
						</div>
					)
				);
			case 'draftPreview':
				return container(
					renderers?.draftPreview ? (
						renderers.draftPreview()
					) : (
						<div className="flex items-center gap-2 overflow-hidden">
							<Pill className="truncate max-w-[160px] font-semibold">
								{contacts?.[0]?.firstName || 'Contact'}
							</Pill>
							<Pill className="truncate max-w-[270px] font-semibold">
								{subject || 'Subject preview'}
							</Pill>
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
						<div className="flex items-center gap-2 overflow-hidden">
							<Pill className="truncate max-w-[160px] font-semibold">
								{draftedEmails?.[0]?.contact?.firstName ||
									contacts?.[0]?.firstName ||
									'Contact'}
							</Pill>
							<Pill className="truncate max-w-[270px] font-semibold">
								{draftedEmails?.[0]?.subject || subject || 'Subject preview'}
							</Pill>
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
					<SectionShell
						label="Contacts"
						accentClass="bg-[#F6D3D3]"
						number={
							<div className="flex items-center">
								1 <ChevronsRight size={12} className="ml-0.5" />
							</div>
						}
						rightNode={
							<div className="flex items-center gap-2">
								<CountPill label={`${contactsCount} people`} />
								<button
									type="button"
									className="text-[11px] px-2 h-5 rounded-sm border border-black/20 shadow-[0_1px_0_#000] bg-white/80 font-semibold leading-none"
									onClick={() => setActivePreview('contacts')}
								>
									Select
								</button>
								<button
									type="button"
									className="text-[11px] px-2 h-5 rounded-sm border border-black/20 shadow-[0_1px_0_#000] bg-white/80 font-semibold leading-none"
									onClick={() => setActivePreview('draftPreview')}
								>
									Draft
								</button>
							</div>
						}
					>
						{isDrafting && (
							<div className="mt-1">
								<div className="text-[10px] mb-0.5">Drafting</div>
								<div className="h-1.5 w-full rounded-sm border border-black/20 bg-white">
									<div
										className="h-full bg-[#B5E2B5]"
										style={{ width: `${draftingPct}%` }}
									/>
								</div>
							</div>
						)}
					</SectionShell>

					{/* Email Structure */}
					<SectionShell
						label="Email Structure"
						accentClass="bg-[#E6E6E6]"
						number={2}
						rightNode={
							<div className="flex items-center gap-2">
								<Pill className="bg-[#DBDBFF] font-semibold">{draftingMode}</Pill>
								<Pill className="bg-[#DBFFDB] font-semibold">
									{isAiSubject ? 'Auto Subject' : 'Subject'}
								</Pill>
								<Pill className="font-semibold">{fromName || 'From'}</Pill>
							</div>
						}
						onClick={() => setActivePreview('emailStructure')}
					/>

					{/* Draft Preview */}
					<SectionShell
						label="Draft Preview"
						accentClass="bg-[#D1DAFF]"
						number={<ChevronsRight size={14} />}
						rightNode={
							<div className="flex items-center gap-2">
								<Pill className="truncate max-w-[160px] font-semibold">
									{contacts?.[0]?.firstName || 'Contact'}
								</Pill>
								<Pill className="truncate max-w-[220px] font-semibold">
									{subject || 'Subject preview'}
								</Pill>
							</div>
						}
						onClick={() => setActivePreview('draftPreview')}
					/>

					{/* Drafts */}
					<SectionShell
						label="Drafts"
						accentClass="bg-[#F4E5BC]"
						number={
							<div className="flex items-center">
								3 <ChevronsRight size={12} className="ml-0.5" />
							</div>
						}
						rightNode={
							<div className="flex items-center gap-2">
								<CountPill label={`${draftsCount} drafts`} />
								<button
									type="button"
									className="text-[11px] px-2 h-5 rounded-sm border border-black/20 shadow-[0_1px_0_#000] bg-white/80 font-semibold leading-none"
									onClick={() => setActivePreview('drafts')}
								>
									Select
								</button>
								<button
									type="button"
									className="text-[11px] px-2 h-5 rounded-sm border border-black/20 shadow-[0_1px_0_#000] bg-white/80 font-semibold leading-none"
									onClick={() => setActivePreview('sendPreview')}
								>
									Send
								</button>
							</div>
						}
					/>

					{/* Send Preview */}
					<SectionShell
						label="Send Preview"
						accentClass="bg-[#D1DAFF]"
						number={<ChevronsRight size={14} />}
						rightNode={
							<div className="flex items-center gap-2">
								<Pill className="truncate max-w-[160px] font-semibold">
									{draftedEmails?.[0]?.contact?.firstName ||
										contacts?.[0]?.firstName ||
										'Contact'}
								</Pill>
								<Pill className="truncate max-w-[220px] font-semibold">
									{draftedEmails?.[0]?.subject || subject || 'Subject preview'}
								</Pill>
							</div>
						}
						onClick={() => setActivePreview('sendPreview')}
					/>

					{/* Sent */}
					<SectionShell
						label="Sent"
						accentClass="bg-[#CFEBCF]"
						number={
							<div className="flex items-center">
								4 <ChevronsRight size={12} className="ml-0.5" />
							</div>
						}
						rightNode={
							<CountPill label={`${sentCount.toString().padStart(2, '0')} sent`} />
						}
						onClick={() => setActivePreview('sent')}
					/>

					{renderActivePreview()}
				</div>
			)}
		</div>
	);
};

export default DraftingStatusPanel;
