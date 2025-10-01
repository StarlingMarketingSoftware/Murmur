'use client';

import { FC } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { DraftingFormValues } from '../useDraftingSection';
import { cn } from '@/utils';
import { MiniEmailStructure } from '../EmailGeneration/MiniEmailStructure';

export interface EmailStructureExpandedBoxProps {
	form: UseFormReturn<DraftingFormValues>;
	onHeaderClick?: () => void;
	// Optional drafting controls if available in the parent
	onDraft?: () => void;
	isDraftDisabled?: boolean;
	isPendingGeneration?: boolean;
	generationProgress?: number;
	generationTotal?: number;
	onCancel?: () => void;
}

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

export const EmailStructureExpandedBox: FC<EmailStructureExpandedBoxProps> = ({
	form,
	onHeaderClick,
	onDraft,
	isDraftDisabled,
	isPendingGeneration,
	generationProgress,
	generationTotal,
	onCancel,
}) => {
	return (
		<div
			className="w-[376px] max-[480px]:w-[96.27vw] h-auto px-0 pb-0 flex flex-col bg-transparent mb-2"
			role="region"
			aria-label="Expanded email structure"
		>
			{/* Header */}
			<div
				className={cn(
					'flex items-center gap-2 h-[21px] px-1',
					onHeaderClick ? 'cursor-pointer' : ''
				)}
				role={onHeaderClick ? 'button' : undefined}
				tabIndex={onHeaderClick ? 0 : undefined}
				onClick={onHeaderClick}
				onKeyDown={(e) => {
					if (!onHeaderClick) return;
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onHeaderClick();
					}
				}}
			>
				<span className="font-bold text-black text-sm">Email Structure</span>
				<div className="self-stretch ml-auto flex items-center text-sm font-bold text-black/80 w-[46px] flex-shrink-0 pl-2">
					<span className="w-[20px] text-center">2</span>
					<ArrowIcon />
				</div>
			</div>

			{/* Body */}
			<div className="pt-1 flex justify-center">
				<MiniEmailStructure
					form={form}
					onDraft={onDraft || (() => {})}
					isDraftDisabled={Boolean(isDraftDisabled ?? true)}
					isPendingGeneration={Boolean(isPendingGeneration)}
					generationProgress={generationProgress}
					generationTotal={generationTotal}
					onCancel={onCancel}
					hideTopChrome
					hideFooter
				/>
			</div>
		</div>
	);
};

export default EmailStructureExpandedBox;
