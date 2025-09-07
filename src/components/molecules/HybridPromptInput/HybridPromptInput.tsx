import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext } from 'react-hook-form';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { Droppable } from '../DragAndDrop/Droppable';
import { Typography } from '@/components/ui/typography';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/DraftingSection/useDraftingSection';
import { HybridBlock } from '@prisma/client';
import { HybridPromptInputProps, useHybridPromptInput } from './useHybridPromptInput';
import { cn } from '@/utils';
import React, { useState, FC, Fragment, useRef, useEffect, useMemo } from 'react';
import { TestPreviewPanel } from '../TestPreviewPanel/TestPreviewPanel';
import TinyPlusIcon from '@/components/atoms/_svg/TinyPlusIcon';
import { ParagraphSlider } from '@/components/atoms/ParagraphSlider/ParagraphSlider';
import { ToneSelector } from '../ToneSelector/ToneSelector';
import { DraggableHighlight } from '../DragAndDrop/DraggableHighlight';
interface SortableAIBlockProps {
	block: { value: HybridBlock; label: string; placeholder?: string };
	id: string;
	fieldIndex: number;
	onRemove: (id: string) => void;
	trackFocusedField?: (
		fieldName: string,
		element: HTMLTextAreaElement | HTMLInputElement | null
	) => void;
	showTestPreview?: boolean;
	testMessage?: string | null;
}

const SortableAIBlock = ({
	block,
	id,
	fieldIndex,
	onRemove,
	trackFocusedField,
	showTestPreview,
	testMessage,
}: SortableAIBlockProps) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id });
	const form = useFormContext<DraftingFormValues>();
	const [isEdit, setIsEdit] = useState(
		form.getValues(`hybridBlockPrompts.${fieldIndex}.value`) !== ''
	);
	// Track if the text field has been touched (user has interacted with it)
	const [hasBeenTouched, setHasBeenTouched] = useState(false);

	const style = {
		transform: CSS.Transform.toString(transform),
		WebkitTransform: CSS.Transform.toString(transform),
		transition,
		WebkitTransition: transition,
	};

	const isTextBlock = block.value === HybridBlock.text;
	const isFullAutomatedBlock = block.value === HybridBlock.full_automated;
	const isIntroductionBlock = block.value === HybridBlock.introduction;
	const isResearchBlock = block.value === HybridBlock.research;
	const isActionBlock = block.value === HybridBlock.action;
	const isCompactBlock =
		block.value === HybridBlock.introduction ||
		block.value === HybridBlock.research ||
		block.value === HybridBlock.action ||
		block.value === HybridBlock.text;

	// Watch the field value to determine if text block is empty
	const fieldValue = form.watch(`hybridBlockPrompts.${fieldIndex}.value`);
	const isTextBlockEmpty = isTextBlock && !fieldValue;
	// Only show red styling if the field has been touched and is empty
	const shouldShowRedStyling = isTextBlockEmpty && hasBeenTouched;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				'relative rounded-md p-0.5',
				isIntroductionBlock &&
					'bg-gradient-to-r from-[#C9C9FF] via-[#5E6399] to-[#C9C9FF]',
				isResearchBlock && 'bg-gradient-to-r from-[#4A4AD9] via-[#272773] to-[#4A4AD9]',
				isActionBlock && 'bg-gradient-to-r from-[#040488] via-[#020255] to-[#040488]',
				isIntroductionBlock || isResearchBlock || isActionBlock
					? ''
					: 'border-2 border-gray-300 bg-background',
				isTextBlock
					? showTestPreview
						? 'w-[416px] h-[44px]'
						: 'w-[868px] h-[80px]'
					: isCompactBlock
					? showTestPreview
						? 'w-[416px] h-[44px]'
						: 'w-[868px] h-[44px]'
					: isFullAutomatedBlock
					? showTestPreview
						? 'w-[416px]'
						: 'w-[868px]'
					: showTestPreview
					? 'w-[416px]'
					: 'w-[868px]',
				!isIntroductionBlock &&
					!isResearchBlock &&
					!isActionBlock &&
					(shouldShowRedStyling
						? 'border-[#A20000]'
						: isTextBlock
						? 'border-primary'
						: 'border-secondary'),
				isDragging ? 'opacity-50 z-50 transform-gpu' : ''
			)}
		>
			{/* Inner content wrapper */}
			<div
				className={cn(
					isIntroductionBlock || isResearchBlock || isActionBlock
						? 'bg-background rounded-md h-full'
						: '',
					'relative'
				)}
			>
				{/* Drag handle */}
				<div
					{...attributes}
					{...listeners}
					className={cn(
						'absolute top-0 left-0 cursor-move z-[1]',
						isTextBlock
							? showTestPreview
								? 'h-[44px] w-[80px]'
								: 'h-[80px] w-[172px]'
							: isCompactBlock
							? showTestPreview
								? 'h-[44px] w-[80px]'
								: 'h-[44px] w-[140px]'
							: 'h-12',
						isFullAutomatedBlock
							? 'w-[172px]'
							: !isCompactBlock && !isFullAutomatedBlock
							? 'w-full'
							: ''
					)}
				/>
				{/* Block content container */}
				<div
					className={cn(
						'flex items-center w-full',
						isCompactBlock
							? 'p-2 h-full'
							: isFullAutomatedBlock || isTextBlock
							? 'px-4 pt-2 pb-4'
							: 'p-4'
					)}
				>
					<div className={cn('flex-grow min-w-0', isCompactBlock && 'flex items-center')}>
						{isDragging && (
							<div className="absolute inset-0 rounded-md bg-background z-10 pointer-events-none" />
						)}
						<div
							className={cn(
								'absolute z-30',
								isCompactBlock
									? 'right-2 top-1/2 -translate-y-1/2'
									: isFullAutomatedBlock || isTextBlock
									? 'right-3 top-2'
									: 'right-3 top-3'
							)}
						>
							{!isTextBlock && !isFullAutomatedBlock && !isCompactBlock && (
								<Button
									type="button"
									className="mr-1"
									variant="action-link"
									onClick={(e) => {
										e.stopPropagation();
										setIsEdit(!isEdit);
									}}
								>
									{isEdit ? 'Cancel' : 'Edit'}
								</Button>
							)}
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className={cn(isCompactBlock && 'h-8 w-8')}
								onClick={(e) => {
									e.stopPropagation();
									onRemove(id);
								}}
							>
								<X className="h-[13px] w-[13px] text-destructive-dark" />
							</Button>
						</div>
						{isCompactBlock ? (
							// Compact blocks
							<div className="flex items-center w-full h-full">
								{isTextBlock ? (
									<>
										<div className="flex flex-col justify-center w-[140px]">
											<span
												className={cn(
													'font-inter font-medium text-[17px] leading-[14px]',
													shouldShowRedStyling && 'text-[#A20000]'
												)}
											>
												Text
											</span>
										</div>
										{(() => {
											const fieldProps = form.register(
												`hybridBlockPrompts.${fieldIndex}.value`
											);
											return (
												<input
													type="text"
													placeholder={block.placeholder}
													onClick={(e) => e.stopPropagation()}
													className={cn(
														'flex-1 bg-white outline-none text-sm',
														showTestPreview ? 'pl-0 -ml-[72px]' : 'pl-6',
														'pr-12',
														shouldShowRedStyling
															? 'placeholder:text-[#A20000]'
															: 'placeholder:text-[#000000]'
													)}
													{...fieldProps}
													onFocus={(e) => {
														trackFocusedField?.(
															`hybridBlockPrompts.${fieldIndex}.value`,
															e.target as HTMLInputElement
														);
													}}
													onBlur={(e) => {
														if (isTextBlock) {
															setHasBeenTouched(true);
														}
														fieldProps.onBlur(e);
													}}
													onChange={(e) => {
														if (isTextBlock && e.target.value) {
															setHasBeenTouched(true);
														}
														fieldProps.onChange(e);
													}}
												/>
											);
										})()}
									</>
								) : (
									// Compact blocks with "Hybrid"
									<>
										<div className="flex flex-col justify-center w-[140px]">
											<span className="font-inter font-medium text-[17px] leading-[14px]">
												Hybrid
											</span>
											<span
												className={cn(
													'font-inter font-normal text-xs leading-[14px] mt-1',
													isIntroductionBlock && 'text-[#9D9DFF]',
													isResearchBlock && 'text-[#4A4AD9]',
													isActionBlock && 'text-[#040488]'
												)}
											>
												{isIntroductionBlock
													? 'Intro'
													: isResearchBlock
													? 'RC'
													: isActionBlock
													? 'CTA'
													: (block as { label: string }).label}
											</span>
										</div>
										{(() => {
											const fieldProps = form.register(
												`hybridBlockPrompts.${fieldIndex}.value`
											);
											return (
												<input
													type="text"
													placeholder={block.placeholder}
													onClick={(e) => e.stopPropagation()}
													className={cn(
														'flex-1 bg-white outline-none text-sm placeholder:text-gray-400',
														showTestPreview ? 'pl-0 -ml-[72px]' : 'pl-6',
														'pr-12'
													)}
													{...fieldProps}
													onFocus={(e) => {
														trackFocusedField?.(
															`hybridBlockPrompts.${fieldIndex}.value`,
															e.target as HTMLInputElement
														);
													}}
												/>
											);
										})()}
									</>
								)}
							</div>
						) : (
							// Non-compact blocks
							<>
								{!isTextBlock && !isFullAutomatedBlock && (
									<span className="font-inter font-medium text-[17px] mb-2 block">
										Hybrid
									</span>
								)}
								<div
									className={cn(
										'flex gap-2 min-h-7 items-center relative z-20',
										isFullAutomatedBlock || isTextBlock ? 'mb-1' : 'mb-2',
										isFullAutomatedBlock && showTestPreview && testMessage && 'flex-wrap'
									)}
								>
									{!isTextBlock ? (
										<>
											<Typography
												variant="h4"
												className={cn(
													'font-inter',
													isIntroductionBlock && 'text-[#9D9DFF]',
													isResearchBlock && 'text-[#4A4AD9]',
													isActionBlock && 'text-[#040488]',
													isFullAutomatedBlock && 'font-semibold text-[17px]'
												)}
											>
												{isFullAutomatedBlock
													? 'Full Auto'
													: (block as { label: string }).label}
											</Typography>

											<ToneSelector isCompact={!!showTestPreview && !!testMessage} />
										</>
									) : (
										<Typography
											variant="h4"
											className={cn(
												'font-inter',
												shouldShowRedStyling && 'text-[#A20000]'
											)}
										>
											Text
										</Typography>
									)}
								</div>
								{isTextBlock || isFullAutomatedBlock ? (
									(() => {
										const fieldProps = form.register(
											`hybridBlockPrompts.${fieldIndex}.value`
										);
										const fieldValue = form.watch(
											`hybridBlockPrompts.${fieldIndex}.value`
										);
										const showCustomPlaceholder = isFullAutomatedBlock && !fieldValue;

										return (
											<>
												<div className={isFullAutomatedBlock ? 'relative' : ''}>
													{showCustomPlaceholder && (
														<div className="absolute inset-0 pointer-events-none py-2 pr-10 text-[#505050] text-base md:text-sm">
															<div className="space-y-3">
																<div>
																	<p>Prompt Murmur here.</p>
																	<p>
																		Tell it what you want to say and it will compose
																		emails based on your instructions.
																	</p>
																</div>
																<div>
																	<p>Ex.</p>
																	<p>
																		&ldquo;Compose a professional booking pitch email.
																		Include one or two facts about the venue, introduce my
																		band honestly, highlight our fit for their space, and
																		end with a straightforward next-steps question. Keep
																		tone warm, clear, and brief.&rdquo;
																	</p>
																</div>
															</div>
														</div>
													)}
													<Textarea
														placeholder={
															isFullAutomatedBlock
																? ''
																: 'placeholder' in block
																? (block as { placeholder?: string }).placeholder || ''
																: ''
														}
														onClick={(e) => e.stopPropagation()}
														className={cn(
															'border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 max-w-full min-w-0 bg-white',
															isFullAutomatedBlock ? 'h-[195px] px-0 resize-none' : '',
															shouldShowRedStyling ? 'placeholder:text-[#A20000]' : ''
														)}
														{...fieldProps}
														onFocus={(e) => {
															trackFocusedField?.(
																`hybridBlockPrompts.${fieldIndex}.value`,
																e.target as HTMLTextAreaElement
															);
														}}
														onBlur={(e) => {
															if (isTextBlock) {
																setHasBeenTouched(true);
															}
															fieldProps.onBlur(e);
														}}
														onChange={(e) => {
															if (isTextBlock && e.target.value) {
																setHasBeenTouched(true);
															}
															fieldProps.onChange(e);
														}}
													/>
												</div>
												{isFullAutomatedBlock && <ParagraphSlider />}
											</>
										);
									})()
								) : (
									// For other blocks, show input only when in edit mode
									<>
										{isEdit &&
											(() => {
												const fieldProps = form.register(
													`hybridBlockPrompts.${fieldIndex}.value`
												);
												return (
													<Input
														placeholder={
															'placeholder' in block
																? (block as { placeholder?: string }).placeholder || ''
																: ''
														}
														onClick={(e) => e.stopPropagation()}
														className="border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white"
														{...fieldProps}
														onFocus={(e) => {
															trackFocusedField?.(
																`hybridBlockPrompts.${fieldIndex}.value`,
																e.target as HTMLInputElement
															);
														}}
													/>
												);
											})()}
									</>
								)}
							</>
						)}
					</div>
				</div>
				{/* End of Block content container */}
			</div>
		</div>
	);
};

export const HybridPromptInput: FC<HybridPromptInputProps> = (props) => {
	const {
		form,
		fields,
		handleDragEnd,
		handleRemoveBlock,
		getBlock,
		handleAddTextBlockAt,
		showTestPreview,
		setShowTestPreview,
		trackFocusedField,
		testMessage,
		handleGenerateTestDrafts,
		isGenerationDisabled,
		isPendingGeneration,
		isTest,
		contact,
	} = useHybridPromptInput(props);

	// Track if the user has attempted to Test to control error styling
	const [hasAttemptedTest, setHasAttemptedTest] = useState(false);

	// Subject field red styling (manual mode): mirror text block behavior
	const subjectValue = form.watch('subject');
	const isManualSubject = !form.watch('isAiSubject');
	const [hasSubjectBeenTouched, setHasSubjectBeenTouched] = useState(false);
	const shouldShowSubjectRedStyling =
		isManualSubject &&
		hasSubjectBeenTouched &&
		(!subjectValue || subjectValue.trim() === '');

	const watchedBlocks = form.watch('hybridBlockPrompts') || [];
	const isHandwrittenMode =
		watchedBlocks.length > 0 && watchedBlocks.every((b) => b.type === HybridBlock.text);
	const hasBlocks = (form.watch('hybridBlockPrompts')?.length || 0) > 0;

	// Check for empty text blocks
	const hasEmptyTextBlocks = watchedBlocks.some(
		(block) =>
			block.type === HybridBlock.text && (!block.value || block.value.trim() === '')
	);

	// Determine if any empty text block has been touched (blurred) to align with per-block red logic
	// Access touchedFields to subscribe to touch updates
	const touchedFields = form.formState.touchedFields as unknown as {
		hybridBlockPrompts?: Array<{ value?: boolean }>;
	};
	const hasTouchedEmptyTextBlocks = watchedBlocks.some(
		(block: { type: HybridBlock; value: string }, index: number) => {
			if (block.type !== HybridBlock.text) return false;
			const isTouched = Boolean(touchedFields?.hybridBlockPrompts?.[index]?.value);
			const isEmpty = !block.value || block.value.trim() === '';
			return isTouched && isEmpty;
		}
	);

	// Derive selected mode key for stable overlay updates
	const isFullSelected = watchedBlocks.some((b) => b.type === HybridBlock.full_automated);
	const isManualSelected =
		watchedBlocks.length > 0 && watchedBlocks.every((b) => b.type === HybridBlock.text);
	const lastModeRef = useRef<'full' | 'hybrid' | 'manual' | null>(null);
	const [modeOverride, setModeOverride] = useState<'none' | null>(null);
	useEffect(() => {
		if (isFullSelected) {
			lastModeRef.current = 'full';
			setModeOverride(null);
			return;
		}
		if (watchedBlocks.length === 0 && lastModeRef.current === 'full') {
			setModeOverride('none');
		} else {
			setModeOverride(null);
			if (isManualSelected) lastModeRef.current = 'manual';
			else if (watchedBlocks.length > 0) lastModeRef.current = 'hybrid';
			else lastModeRef.current = null;
		}
	}, [isFullSelected, isManualSelected, watchedBlocks.length]);
	const selectedModeKey = useMemo(
		() =>
			modeOverride === 'none'
				? 'none'
				: isFullSelected
				? 'full'
				: isManualSelected
				? 'manual'
				: 'hybrid',
		[modeOverride, isFullSelected, isManualSelected]
	);

	const switchToFull = () => {
		const current: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('hybridBlockPrompts') || [];
		if (current.length > 0 && current.every((b) => b.type === HybridBlock.text)) {
			form.setValue('savedManualBlocks', current);
		} else if (
			current.length > 0 &&
			!current.some((b) => b.type === HybridBlock.full_automated)
		) {
			form.setValue('savedHybridBlocks', current);
		}
		form.setValue('hybridBlockPrompts', [
			{
				id: 'full_automated',
				type: HybridBlock.full_automated,
				value: form.getValues('fullAiPrompt') || '',
			},
		]);
		form.setValue('isAiSubject', true);
	};
	const switchToHybrid = () => {
		const current: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('hybridBlockPrompts') || [];
		if (current.some((b) => b.type === HybridBlock.full_automated)) {
			form.setValue(
				'fullAiPrompt',
				(current.find((b) => b.type === HybridBlock.full_automated)?.value as string) ||
					''
			);
		} else if (current.length > 0 && current.every((b) => b.type === HybridBlock.text)) {
			form.setValue('savedManualBlocks', current);
		} else if (current.length > 0) {
			form.setValue('savedHybridBlocks', current);
		}
		const savedHybrid: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('savedHybridBlocks') || [];
		form.setValue(
			'hybridBlockPrompts',
			savedHybrid.length > 0
				? savedHybrid
				: [
						{
							id: 'introduction',
							type: HybridBlock.introduction,
							value: '',
						},
						{
							id: 'research',
							type: HybridBlock.research,
							value: '',
						},
						{ id: 'action', type: HybridBlock.action, value: '' },
				  ]
		);
		form.setValue('isAiSubject', true);
	};

	const switchToManual = () => {
		const current: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('hybridBlockPrompts') || [];
		if (current.some((b) => b.type === HybridBlock.full_automated)) {
			form.setValue(
				'fullAiPrompt',
				(current.find((b) => b.type === HybridBlock.full_automated)?.value as string) ||
					''
			);
		} else if (current.length > 0 && !current.every((b) => b.type === HybridBlock.text)) {
			form.setValue('savedHybridBlocks', current);
		}
		const savedManual: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('savedManualBlocks') || [];
		form.setValue(
			'hybridBlockPrompts',
			savedManual.length > 0
				? savedManual
				: [{ id: 'text-0', type: HybridBlock.text, value: '' }]
		);
		form.setValue('isAiSubject', false);
	};

	const handleClearAllInside = () => {
		form.setValue('hybridBlockPrompts', []);
		form.setValue('hybridAvailableBlocks', [
			HybridBlock.full_automated,
			HybridBlock.introduction,
			HybridBlock.research,
			HybridBlock.action,
			HybridBlock.text,
		]);
	};

	const modeContainerRef = useRef<HTMLDivElement>(null);
	const fullModeButtonRef = useRef<HTMLButtonElement>(null);
	const hybridModeButtonRef = useRef<HTMLButtonElement>(null);
	const manualModeButtonRef = useRef<HTMLButtonElement>(null);

	const [highlightStyle, setHighlightStyle] = useState({
		left: 0,
		width: 0,
		opacity: 0,
	});
	const [isInitialRender, setIsInitialRender] = useState(true);

	const dragBounds = useRef({ min: 0, max: 0 });

	useEffect(() => {
		if (selectedModeKey === 'none') {
			setHighlightStyle({
				left: 0,
				width: 0,
				opacity: 0,
			});
			if (isInitialRender) {
				setIsInitialRender(false);
			}
			return;
		}
		let targetButton;
		if (selectedModeKey === 'full') {
			targetButton = fullModeButtonRef.current;
		} else if (selectedModeKey === 'hybrid') {
			targetButton = hybridModeButtonRef.current;
		} else {
			targetButton = manualModeButtonRef.current;
		}

		if (targetButton) {
			const newLeft = targetButton.offsetLeft + targetButton.offsetWidth / 2 - 80.38 / 2;
			setHighlightStyle({
				left: newLeft,
				width: 80.38,
				opacity: 1,
			});
			if (isInitialRender) {
				setIsInitialRender(false);
			}
		}

		if (fullModeButtonRef.current && manualModeButtonRef.current) {
			const min =
				fullModeButtonRef.current.offsetLeft +
				fullModeButtonRef.current.offsetWidth / 2 -
				80.38 / 2;
			const max =
				manualModeButtonRef.current.offsetLeft +
				manualModeButtonRef.current.offsetWidth / 2 -
				80.38 / 2;
			dragBounds.current = { min, max };
		}
	}, [selectedModeKey, isInitialRender]);

	const restrictToHorizontalAxisAndBounds = ({
		transform,
	}: {
		transform: { x: number; y: number; scaleX: number; scaleY: number };
	}) => {
		const currentX = highlightStyle.left + transform.x;
		const { min, max } = dragBounds.current;

		if (min === 0 && max === 0) {
			return { ...transform, y: 0 };
		}

		const constrainedX = Math.max(min, Math.min(currentX, max));
		const newTransformX = constrainedX - highlightStyle.left;

		return {
			...transform,
			x: newTransformX,
			y: 0,
		};
	};

	const handleHighlightDragEnd = (event: { delta: { x: number } }) => {
		const finalX = highlightStyle.left + event.delta.x;

		const positions = [
			{
				mode: 'full',
				center:
					(fullModeButtonRef.current?.offsetLeft ?? 0) +
					(fullModeButtonRef.current?.offsetWidth ?? 0) / 2,
			},
			{
				mode: 'hybrid',
				center:
					(hybridModeButtonRef.current?.offsetLeft ?? 0) +
					(hybridModeButtonRef.current?.offsetWidth ?? 0) / 2,
			},
			{
				mode: 'manual',
				center:
					(manualModeButtonRef.current?.offsetLeft ?? 0) +
					(manualModeButtonRef.current?.offsetWidth ?? 0) / 2,
			},
		];

		const closest = positions.reduce((prev, curr) => {
			return Math.abs(curr.center - (finalX + 80.38 / 2)) <
				Math.abs(prev.center - (finalX + 80.38 / 2))
				? curr
				: prev;
		});

		if (closest.mode === 'full') {
			switchToFull();
		} else if (closest.mode === 'hybrid') {
			switchToHybrid();
		} else {
			switchToManual();
		}
	};

	return (
		<div>
			<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
				<Droppable id="droppable">
					<div
						className={`w-[892px] min-h-[530px] border-[3px] border-black rounded-md bg-gray-50 transition mb-4 flex ${
							showTestPreview ? 'flex-row' : 'flex-col'
						} relative overflow-hidden`}
					>
						{/* Left-side blurred backdrop fill for test preview */}
						{showTestPreview && (
							<div className="pointer-events-none absolute left-3 top-[18px] bottom-3 w-[416px] z-0">
								<div
									className="absolute inset-0"
									style={{
										background:
											'radial-gradient(ellipse 115% 100% at 45% 45%, rgba(222,242,225,1) 0%, rgba(222,242,225,0.85) 45%, rgba(222,242,225,0.4) 70%, rgba(222,242,225,0.12) 88%, rgba(222,242,225,0) 100%)',
										opacity: 1,
										filter: 'blur(140px)',
										willChange: 'transform',
										transform: 'scale(1.3)',
									}}
								/>
							</div>
						)}
						{/* Left side - Content area */}
						<div
							className={cn(
								`flex flex-col min-h-[530px]`,
								showTestPreview ? 'w-1/2 pt-[18px] relative z-10' : 'w-full'
							)}
						>
							{/* Subject header inside the box */}
							<div className="px-3 pt-0 pb-0">
								<div className="h-[36px] flex items-center relative z-20">
									{showTestPreview && (
										<div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-[416px] h-[44px] border-[2px] border-black rounded-[8px] bg-white -z-10" />
									)}
									<span
										className={cn(
											'font-inter font-semibold text-[17px] mr-[56px] text-black',
											showTestPreview && 'ml-3'
										)}
									>
										Mode
									</span>
									<div
										ref={modeContainerRef}
										className="relative flex items-center gap-[67px]"
									>
										<DndContext
											onDragEnd={handleHighlightDragEnd}
											modifiers={[restrictToHorizontalAxisAndBounds]}
										>
											{selectedModeKey !== 'none' && (
												<DraggableHighlight
													style={highlightStyle}
													isInitialRender={isInitialRender}
													mode={selectedModeKey as 'full' | 'hybrid' | 'manual'}
												/>
											)}
										</DndContext>
										<Button
											ref={fullModeButtonRef}
											variant="ghost"
											type="button"
											className={cn(
												'!p-0 h-fit !m-0 text-[11.7px] font-inter font-semibold bg-transparent z-20',
												selectedModeKey !== 'none' &&
													watchedBlocks.some((b) => b.type === HybridBlock.full_automated)
													? 'text-black'
													: 'text-[#AFAFAF] hover:text-[#8F8F8F]'
											)}
											onClick={switchToFull}
										>
											Full Auto
										</Button>
										<Button
											ref={hybridModeButtonRef}
											variant="ghost"
											type="button"
											className={cn(
												'!p-0 h-fit !m-0 text-[11.7px] font-inter font-semibold bg-transparent z-20',
												selectedModeKey !== 'none' &&
													!watchedBlocks.some(
														(b) => b.type === HybridBlock.full_automated
													) &&
													!watchedBlocks.every((b) => b.type === HybridBlock.text)
													? 'text-black'
													: 'text-[#AFAFAF] hover:text-[#8F8F8F]'
											)}
											onClick={switchToHybrid}
										>
											Hybrid
										</Button>
										<Button
											ref={manualModeButtonRef}
											variant="ghost"
											type="button"
											className={cn(
												'!p-0 h-fit !m-0 text-[11.7px] font-inter font-semibold bg-transparent z-20',
												selectedModeKey !== 'none' &&
													watchedBlocks.length > 0 &&
													watchedBlocks.every((b) => b.type === HybridBlock.text)
													? 'text-black'
													: 'text-[#AFAFAF] hover:text-[#8F8F8F]'
											)}
											onClick={switchToManual}
										>
											Manual
										</Button>
									</div>
								</div>
								<div
									className={cn('-mx-3 h-[2px] bg-black', showTestPreview && 'hidden')}
								/>
								{showTestPreview && <div className="h-2" />}
								<div className="flex flex-col items-center">
									<FormField
										control={form.control}
										name="subject"
										rules={{ required: form.watch('isAiSubject') }}
										render={({ field }) => (
											<FormItem
												className={cn(showTestPreview ? 'w-[416px]' : 'w-[868px]')}
											>
												<div
													className={cn(
														'flex items-center',
														showTestPreview
															? 'justify-end pr-[24px] mt-1 mb-1'
															: 'justify-end mb-2 pr-5'
													)}
												>
													<div className="flex items-center gap-2"></div>
													{hasBlocks && (
														<button
															type="button"
															onClick={handleClearAllInside}
															className={cn(
																showTestPreview ? 'text-xs' : 'text-sm',
																'font-inter font-medium text-[#AFAFAF] hover:underline',
																showTestPreview ? 'mr-[12px]' : 'relative top-[4px]'
															)}
														>
															Clear All
														</button>
													)}
												</div>
												<FormControl>
													<div className="relative">
														<div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
															<span className="font-inter font-semibold text-[17px] text-black">
																Subject
															</span>
															<Switch
																checked={form.watch('isAiSubject')}
																disabled={isHandwrittenMode}
																onCheckedChange={(val: boolean) => {
																	form.setValue('isAiSubject', val);
																	if (val) {
																		form.setValue('subject', '');
																	}
																}}
																className="data-[state=checked]:!bg-[#5dab68]"
															/>
															<span className="font-inter font-normal text-[16px]">
																Auto
															</span>
														</div>
														<Input
															className={cn(
																'w-full h-[44px] !bg-white pl-[180px] pr-3 !rounded-[8px]',
																form.watch('isAiSubject')
																	? '!border-[2px] !border-[#969696] !text-[#969696] placeholder:!text-[#969696] disabled:!bg-white disabled:!text-[#969696] disabled:!opacity-100'
																	: shouldShowSubjectRedStyling
																	? '!border-[2px] !border-[#A20000] !text-[#A20000] placeholder:!text-[#A20000]'
																	: '!border-[2px] !border-[#000000] !text-black placeholder:!text-black'
															)}
															placeholder={
																form.watch('isAiSubject')
																	? 'Automated subject'
																	: 'Write your subject here'
															}
															disabled={form.watch('isAiSubject')}
															{...field}
															onFocus={(e) =>
																!form.watch('isAiSubject') &&
																trackFocusedField?.('subject', e.target)
															}
															onBlur={() => {
																if (!form.watch('isAiSubject')) {
																	setHasSubjectBeenTouched(true);
																}
																field.onBlur();
															}}
															onChange={(e) => {
																if (!form.watch('isAiSubject') && e.target.value) {
																	setHasSubjectBeenTouched(true);
																}
																field.onChange(e);
															}}
														/>
													</div>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</div>
							<div className="flex-1 flex flex-col">
								{/* Content area */}
								<div className="pt-[8px] pr-3 pb-3 pl-3 flex flex-col gap-4 items-center flex-1">
									{fields.length === 0 && (
										<span className="text-gray-300 font-primary text-[12px]">
											Add blocks here to build your prompt...
										</span>
									)}
									<SortableContext
										items={fields.map((f) => f.id)}
										strategy={verticalListSortingStrategy}
									>
										{fields.map((field, index) => {
											const isHybridBlock =
												field.type === HybridBlock.introduction ||
												field.type === HybridBlock.research ||
												field.type === HybridBlock.action;
											const hasImmediateTextBlock =
												fields[index + 1]?.type === HybridBlock.text;

											return (
												<Fragment key={field.id}>
													<div className={cn(index === 0 && '-mt-6')}>
														<SortableAIBlock
															id={field.id}
															fieldIndex={index}
															block={getBlock(field.type)}
															onRemove={handleRemoveBlock}
															trackFocusedField={trackFocusedField}
															showTestPreview={showTestPreview}
															testMessage={testMessage}
														/>
													</div>
													{/* Plus button under hybrid blocks */}
													{isHybridBlock && !hasImmediateTextBlock && (
														<div
															className={cn(
																'flex justify-end -mt-1',
																showTestPreview ? 'w-[416px]' : 'w-[868px]'
															)}
														>
															<Button
																type="button"
																onClick={() => handleAddTextBlockAt(index)}
																className="w-[76px] h-[20px] bg-background hover:bg-primary/20 active:bg-primary/20 border border-primary rounded-[4px] !font-normal text-[10px] text-gray-600"
																title="Add text block"
															>
																<TinyPlusIcon
																	width="5px"
																	height="5px"
																	className="!w-[8px] !h-[8px]"
																/>
																<span className="font-secondary">Add text</span>
															</Button>
														</div>
													)}
												</Fragment>
											);
										})}
									</SortableContext>
								</div>
							</div>

							{/*  Signature Block */}
							<div className="px-3 pb-0 mt-auto pt-12 flex justify-center">
								<FormField
									control={form.control}
									name="signature"
									render={({ field }) => (
										<FormItem>
											<div
												className={cn(
													`min-h-[57px] border-2 border-gray-400 rounded-md bg-background px-4 py-2`,
													showTestPreview ? 'w-[416px]' : 'w-[868px]'
												)}
											>
												<FormLabel className="text-base font-semibold font-secondary">
													Signature
												</FormLabel>
												<FormControl>
													<Textarea
														placeholder="Enter your signature..."
														className="border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 mt-1 p-0 resize-none overflow-hidden bg-white"
														style={{
															fontFamily: form.watch('font') || 'Arial',
														}}
														onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
															const target = e.currentTarget;
															target.style.height = 'auto';
															target.style.height = target.scrollHeight + 'px';
														}}
														{...field}
													/>
												</FormControl>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Test Button - Fixed position below signature, centered */}
						<div
							className={cn(
								'flex flex-col items-center px-3',
								showTestPreview && 'hidden'
							)}
						>
							<div className="flex justify-center mt-1 mb-4 w-full">
								<Button
									type="button"
									onClick={() => {
										setShowTestPreview?.(true);
										handleGenerateTestDrafts?.();
										setHasAttemptedTest(true);
									}}
									disabled={isGenerationDisabled?.()}
									className={cn(
										'h-[42px] bg-white border-2 border-primary text-black font-times font-bold rounded-[6px] cursor-pointer flex items-center justify-center font-primary transition-all hover:bg-primary/20 active:bg-primary/20',
										showTestPreview ? 'w-[416px]' : 'w-[868px]',
										isGenerationDisabled?.()
											? 'opacity-50 cursor-not-allowed'
											: 'opacity-100'
									)}
								>
									{isPendingGeneration && isTest ? 'Testing...' : 'Test'}
								</Button>
							</div>

							{/* Error message for empty text blocks */}
							{hasEmptyTextBlocks && (
								<div
									className={cn(
										hasTouchedEmptyTextBlocks || hasAttemptedTest
											? 'text-destructive'
											: 'text-black',
										'text-sm font-medium -mt-2 mb-2',
										showTestPreview ? 'w-[416px]' : 'w-[868px]'
									)}
								>
									Fill in all text blocks in order to compose an email.
								</div>
							)}
						</div>

						{showTestPreview && (
							<TestPreviewPanel
								setShowTestPreview={setShowTestPreview}
								testMessage={testMessage || ''}
								isLoading={Boolean(isTest) || Boolean(isPendingGeneration)}
								onTest={() => {
									setShowTestPreview?.(true);
									handleGenerateTestDrafts?.();
									setHasAttemptedTest(true);
								}}
								isDisabled={isGenerationDisabled?.()}
								isTesting={Boolean(isPendingGeneration) && Boolean(isTest)}
								contact={contact}
							/>
						)}
					</div>
				</Droppable>
			</DndContext>
		</div>
	);
};
