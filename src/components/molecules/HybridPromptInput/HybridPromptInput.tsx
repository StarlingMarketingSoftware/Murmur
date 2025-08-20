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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVerticalIcon, Trash2 } from 'lucide-react';
import { HelpTooltip } from '@/components/atoms/HelpTooltip/HelpTooltip';
import { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/emailAutomation/draft/useDraftingSection';
import { HybridBlock, Signature } from '@prisma/client';
import { BLOCKS, useHybridPromptInput } from './useHybridPromptInput';
import { twMerge } from 'tailwind-merge';
import { useState } from 'react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Font } from '@/types';
import { FONT_OPTIONS } from '@/constants';
import { Separator } from '@/components/ui/separator';
import RichTextEditor from '@/components/molecules/RichTextEditor/RichTextEditor';

interface SortableAIBlockProps {
	block: (typeof BLOCKS)[number];
	id: string;
	fieldIndex: number;
	onRemove: (id: string) => void;
	trackFocusedField?: (fieldName: string, element: HTMLTextAreaElement | HTMLInputElement | null) => void;
}

const SortableAIBlock = ({ block, id, fieldIndex, onRemove, trackFocusedField }: SortableAIBlockProps) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id });
	const form = useFormContext<DraftingFormValues>();
	const [isEdit, setIsEdit] = useState(
		form.getValues(`hybridBlockPrompts.${fieldIndex}.value`) !== ''
	);

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const isTextBlock = block.value === HybridBlock.text || block.value === 'text';
	const isFullAutomatedBlock = block.value === HybridBlock.full_automated || block.value === 'full_automated';

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={twMerge(
				'w-full relative border-2 border-gray-300 rounded-md bg-gray-100 p-4 pl-1',
				isTextBlock ? 'border-primary' : 'border-secondary',
				isDragging ? 'opacity-50 z-50 translate-z-0' : ''
			)}
		>
			<div className="flex items-center gap-2">
				<div {...attributes} {...listeners} className="cursor-grab h-fit w-fit">
					<GripVerticalIcon className="text-muted" />
				</div>
				<div className="flex-grow">
					{isDragging && <div className="absolute inset-0 rounded-md bg-gray-100 z-10" />}
					<div className="absolute right-3 top-3">
						{!isTextBlock && !isFullAutomatedBlock && (
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
							className="group"
							size="icon"
							onClick={(e) => {
								e.stopPropagation();
								onRemove(id);
							}}
						>
							<Trash2 className="h-4 w-4 group-hover:text-destructive" />
						</Button>
					</div>
					<div className="mb-2 flex gap-2 min-h-7">
						{!isTextBlock && (
							<>
								<Typography variant="h4">{block.label}</Typography>
								<HelpTooltip content={block.help} />
							</>
						)}
					</div>
					{isTextBlock || isFullAutomatedBlock ? (() => {
						const fieldProps = form.register(`hybridBlockPrompts.${fieldIndex}.value`);
						return (
							<Textarea
								placeholder={block.placeholder}
								onClick={(e) => e.stopPropagation()}
								className={isFullAutomatedBlock ? 'h-[400px]' : ''}
								{...fieldProps}
								onFocus={(e) => {
									fieldProps.onFocus?.(e);
									trackFocusedField?.(`hybridBlockPrompts.${fieldIndex}.value`, e.target);
								}}
							/>
						);
					})() : (
						<>
							{isEdit && (() => {
								const fieldProps = form.register(`hybridBlockPrompts.${fieldIndex}.value`);
								return (
									<Input
										placeholder={block.placeholder}
										onClick={(e) => e.stopPropagation()}
										{...fieldProps}
										onFocus={(e) => {
											fieldProps.onFocus?.(e);
											trackFocusedField?.(`hybridBlockPrompts.${fieldIndex}.value`, e.target);
										}}
									/>
								);
							})()}
						</>
					)}
				</div>
			</div>
		</div>
	);
};

interface HybridPromptInputProps {
	trackFocusedField?: (fieldName: string, element: HTMLTextAreaElement | HTMLInputElement | null) => void;
	signatures?: Signature[];
	selectedSignature?: Signature | null;
	setIsOpenSignaturesDialog?: (open: boolean) => void;
}

export const HybridPromptInput = ({ trackFocusedField, signatures, selectedSignature, setIsOpenSignaturesDialog }: HybridPromptInputProps) => {
	const {
		form,
		fields,
		watchedAvailableBlocks,
		handleDragEnd,
		handleRemoveBlock,
		getBlock,
		handleAddBlock,
	} = useHybridPromptInput();

	return (
		<div>
			<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
				<Droppable id="droppable">
					<div className="w-[559px] min-h-[530px] border-[3px] border-black rounded-md p-3 bg-gray-50 flex flex-col gap-3 items-start transition mb-4 overflow-y-auto overflow-x-hidden">
						{fields.length === 0 && (
							<Typography font="secondary" className=" text-gray-400 italic">
								Add blocks here to build your prompt...
							</Typography>
						)}
						<SortableContext
							items={fields.map((f) => f.id)}
							strategy={verticalListSortingStrategy}
						>
							{fields.map((field, index) => (
								<SortableAIBlock
									key={field.id}
									id={field.id}
									fieldIndex={index}
									block={getBlock(field.type)}
									onRemove={handleRemoveBlock}
									trackFocusedField={trackFocusedField}
								/>
							))}
						</SortableContext>
					</div>
				</Droppable>
			</DndContext>

			<div className="flex gap-2 mb-3 justify-center">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button className="!w-[275px] !h-[51px] !text-black !border-2 !py-0 !leading-none flex items-center justify-center !font-bold" type="button" variant="secondary-light">
							Add Automated Text
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-56" align="start">
						<DropdownMenuLabel>Select a Block</DropdownMenuLabel>
						<DropdownMenuGroup>
							{BLOCKS.filter(block =>
								block.value !== HybridBlock.text &&
								block.value !== HybridBlock.full_automated
							).map((block) => {
								const isUsed = !watchedAvailableBlocks.includes(block.value);
								return (
									<DropdownMenuItem
										onClick={() => handleAddBlock(block)}
										key={block.value}
										disabled={isUsed}
									>
										{block.label} {isUsed && '(Used)'}
									</DropdownMenuItem>
								);
							})}
							<DropdownMenuItem
								onClick={() => handleAddBlock(BLOCKS.find(b => b.value === HybridBlock.full_automated)!)}
								key={HybridBlock.full_automated}
							>
								Full Automated
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>

				<Button
					onClick={() => handleAddBlock(getBlock(HybridBlock.text))}
					className="!w-[275px] !h-[51px] !text-black !border-2 !py-0 !leading-none flex items-center justify-center !font-bold"
					type="button"
					variant="primary-light"
				>
					Add Text
				</Button>
			</div>

			<div className="flex flex-col mt-4">
				<div className="flex gap-2 mb-2">
					<FormField
						control={form.control}
						name="font"
						render={({ field }) => (
							<FormItem className="w-[275px]">
								<FormControl>
									<Select
										onValueChange={field.onChange}
										value={field.value as Font}
									>
										<SelectTrigger className="w-full h-[34.99px]">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectLabel>Font</SelectLabel>
												{FONT_OPTIONS.map((font) => (
													<SelectItem key={font} value={font}>
														<span style={{ fontFamily: font }}>{font}</span>
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="signatureId"
						render={({ field }) => (
							<FormItem className="w-[275px]">
								<FormControl>
									<Select
										onValueChange={(value) => {
											if (value === 'manage-signatures') {
												setIsOpenSignaturesDialog?.(true);
												return;
											}
											field.onChange(Number(value));
										}}
										defaultValue={field.value ? field.value.toString() : ''}
										value={field.value ? field.value.toString() : ''}
									>
										<SelectTrigger className="w-full h-[34.99px]">
											<SelectValue placeholder="Select signature" />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectLabel>Signature</SelectLabel>
												{signatures && signatures.length > 0 ? (
													signatures.map((signature: Signature) => (
														<SelectItem
															key={signature.id}
															value={signature.id.toString()}
														>
															{signature.name}
														</SelectItem>
													))
												) : (
													<SelectItem value="no-signatures" disabled>
														No signatures available
													</SelectItem>
												)}
												<Separator className="my-1" />{' '}
											</SelectGroup>
											<SelectGroup>
												<SelectItem value="manage-signatures">
													Manage Signatures
												</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				{selectedSignature && (
					<div className="flex justify-center">
						<div className="w-[559px] overflow-hidden bg-[#E3E3E3]/40 rounded">
							<RichTextEditor
								hideMenuBar
								className="border-none !min-h-fit !py-2 !px-3"
								isEdit={false}
								value={selectedSignature.content || ''}
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
