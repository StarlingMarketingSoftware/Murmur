import { useFormContext, useFieldArray } from 'react-hook-form';
import { DragEndEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { toast } from 'sonner';
import { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/emailAutomation/draft/useDraftingSection';
import { HybridBlock } from '@prisma/client';

export const ORDERED_BLOCKS = [
	HybridBlock.introduction,
	HybridBlock.research,
	HybridBlock.action,
] as const;

export const BLOCKS = [
	{
		label: 'Introduction',
		value: HybridBlock.introduction,
		help: 'Optional. Write a brief prompt for the AI about how to introduce you. This will include the greeting line and the first paragraph of the email.',
		placeholder: 'Prompt the AI about how to introduce you...',
	},
	{
		label: 'Research Contact',
		value: HybridBlock.research,
		help: 'Optional. Write a brief prompt for the AI about how to write about the recipient.',
		placeholder: 'Prompt the AI about how to write about the recipient...',
	},
	{
		label: 'Call to Action',
		value: HybridBlock.action,
		help: 'Optional. Write a brief prompt for the AI about how you want the recipient to respond (email, phone call, etc.)',
		placeholder: 'Prompt the AI about how you want the recipient to respond...',
	},
	{
		label: 'Custom Text',
		value: HybridBlock.text,
		help: 'This is a custom text block. Here you should write exact text that you want included in your email.',
		placeholder: 'Write the exact text you want included in your email...',
	},
];

export const useHybridPromptInput = () => {
	const form = useFormContext<DraftingFormValues>();
	const [textBlockCount, setTextBlockCount] = useState(0);

	const { fields, append, remove, move, insert } = useFieldArray({
		control: form.control,
		name: 'hybridBlockPrompts',
	});

	const watchedAvailableBlocks = form.watch('hybridAvailableBlocks');

	const findCorrectPosition = (newBlock: string, contents: { type: HybridBlock }[]) => {
		if (newBlock === HybridBlock.text) return contents.length;

		const orderedBlockIndex = ORDERED_BLOCKS.indexOf(
			newBlock as (typeof ORDERED_BLOCKS)[number]
		);

		const blockOrderMap = {
			[HybridBlock.introduction]: 0,
			[HybridBlock.research]: 1,
			[HybridBlock.action]: 2,
		};

		const aiBlockNumberSequence: number[] = [];

		const introductionIndex = contents.findIndex(
			(block) => block.type === HybridBlock.introduction
		);
		const researchIndex = contents.findIndex(
			(block) => block.type === HybridBlock.research
		);
		const callToActionIndex = contents.findIndex(
			(block) => block.type === HybridBlock.action
		);

		if (callToActionIndex === 0) {
			toast.error('Call to Action cannot be the first block.');
			if (researchIndex !== -1) {
				return researchIndex + 1;
			} else if (introductionIndex !== -1) {
				return introductionIndex + 1;
			}
			return contents.length;
		}

		for (let i = 0; i < contents.length; i++) {
			const currentBlock = contents[i].type;

			const currentBlockIndex = ORDERED_BLOCKS.indexOf(
				currentBlock as (typeof ORDERED_BLOCKS)[number]
			);

			if (currentBlock === HybridBlock.text) continue;

			aiBlockNumberSequence.push(blockOrderMap[currentBlock]);

			// If we find a block that should come after our new block, insert before it
			if (currentBlockIndex > orderedBlockIndex) {
				return i;
			}
		}

		return contents.length;
	};

	const handleAddBlock = (block: (typeof BLOCKS)[number]) => {
		const newFields = [...fields];
		if (newFields.length === 0) {
			if (block.value === HybridBlock.research || block.value === HybridBlock.action) {
				toast.error('Please use Introduction or Text block as the first block.');
				return;
			}
		}
		const correctPosition = findCorrectPosition(block.value, newFields);

		const currentPosition = fields.findIndex((field) => field.id === block.value);

		if (currentPosition !== -1) {
			remove(currentPosition);
		}

		insert(correctPosition, { id: block.value, type: block.value, value: '' });
		form.setValue(
			'hybridAvailableBlocks',
			watchedAvailableBlocks.filter((b) => b !== block.value)
		);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { over, active } = event;
		if (!over) return;

		const { canBeRemoved, blockWithIssue } = checkBeginningOrder(active.id as string);
		if (!canBeRemoved && blockWithIssue) {
			toast.error(
				`${
					getBlock(blockWithIssue).label
				} cannot be removed from the beginning if there is Research or Call to Action after it.`
			);
			return;
		}

		const isDroppableTarget =
			over.id === 'droppable' || fields.some((field) => field.id === over.id);
		const isDraggableSource = form
			.getValues('hybridAvailableBlocks')
			.includes(active.id as HybridBlock);

		if (isDroppableTarget && isDraggableSource) {
			let activeId: string = active.id as string;
			const blockType = active.id as HybridBlock;

			if (blockType === HybridBlock.text) {
				activeId = `text-${textBlockCount}`;
				setTextBlockCount(textBlockCount + 1);
			}

			if (blockType === HybridBlock.text || activeId.startsWith('text-')) {
				if (over.id === 'droppable') {
					append({ id: activeId, type: blockType, value: '' });
				} else {
					const overIndex = fields.findIndex((field) => field.id === over.id);
					insert(overIndex, { id: activeId, type: blockType, value: '' });
				}
			} else {
				const correctPosition = findCorrectPosition(blockType, fields);
				insert(correctPosition, { id: activeId, type: blockType, value: '' });
			}

			return;
		}

		if (
			fields.some((field) => field.id === active.id) &&
			fields.some((field) => field.id === over.id)
		) {
			const oldIndex = fields.findIndex((field) => field.id === active.id);
			const newIndex = fields.findIndex((field) => field.id === over.id);

			if (
				fields[oldIndex].type === HybridBlock.text ||
				fields[newIndex].type === HybridBlock.text
			) {
				move(oldIndex, newIndex);
				return;
			}

			const tempFields = fields.filter((_, index) => index !== oldIndex);
			const correctPosition = findCorrectPosition(fields[oldIndex].type, tempFields);

			if (newIndex !== correctPosition) {
				toast.error(
					'AI Blocks must be in order: Introduction → Research Contact → Call to Action. Custom Text blocks can be placed anywhere.'
				);
			}

			move(oldIndex, correctPosition);
		}
	};

	const checkBeginningOrder = (id: string) => {
		const blockIndex = fields.findIndex((field) => field.id === id);

		if (blockIndex > 0) {
			return {
				canBeRemoved: true,
				blockWithIssue: null,
			};
		}

		if (blockIndex === -1)
			return {
				canBeRemoved: false,
				blockWithIssue: null,
			};

		const blockToBeRemoved = fields[blockIndex];
		const nextBlock = blockIndex + 1 < fields.length ? fields[blockIndex + 1] : null;
		const previousBlock = blockIndex > 0 ? fields[blockIndex - 1] : null;

		if (blockToBeRemoved.type === HybridBlock.introduction) {
			if (
				previousBlock?.type !== HybridBlock.text &&
				(nextBlock?.type === HybridBlock.research ||
					nextBlock?.type === HybridBlock.action)
			) {
				return {
					canBeRemoved: false,
					blockWithIssue: HybridBlock.introduction,
				};
			}
		}

		if (blockToBeRemoved.type === HybridBlock.text) {
			if (
				(previousBlock?.type !== HybridBlock.text &&
					previousBlock?.type !== HybridBlock.introduction &&
					nextBlock?.type === HybridBlock.research) ||
				nextBlock?.type === HybridBlock.action
			) {
				return {
					canBeRemoved: false,
					blockWithIssue: HybridBlock.text,
				};
			}
		}
		return {
			canBeRemoved: true,
			blockWithIssue: null,
		};
	};

	const handleRemoveBlock = (id: string) => {
		const blockIndex = fields.findIndex((field) => field.id === id);

		if (blockIndex === -1) return;

		const { canBeRemoved, blockWithIssue } = checkBeginningOrder(id);

		if (!canBeRemoved && blockWithIssue) {
			toast.error(
				`${
					getBlock(blockWithIssue).label
				} cannot be removed from the beginning if there is Research or Call to Action after it.`
			);
			return;
		}

		const blockToBeRemoved = fields[blockIndex];
		const nextBlock = blockIndex + 1 < fields.length ? fields[blockIndex + 1] : null;
		const previousBlock = blockIndex > 0 ? fields[blockIndex - 1] : null;

		if (blockToBeRemoved.type === HybridBlock.introduction) {
			if (
				(previousBlock?.type !== HybridBlock.text &&
					nextBlock?.type === HybridBlock.research) ||
				nextBlock?.type === HybridBlock.action
			) {
				toast.error(
					'Introduction cannot be removed if there is Research or Call to Action after it.'
				);
				return;
			}
		}

		if (blockToBeRemoved.type === HybridBlock.text) {
			if (
				nextBlock?.type === HybridBlock.research ||
				nextBlock?.type === HybridBlock.action
			) {
				toast.error(
					'Text block cannot be removed from the beginning if there is Research or Call to Action after it.'
				);
				return;
			}
		}

		const blockType = fields[blockIndex].type;
		// Only add non-text blocks back to available blocks
		if (blockType !== HybridBlock.text) {
			const currentAvailableBlocks = form.getValues('hybridAvailableBlocks');
			const newAvailableBlocks = [...currentAvailableBlocks, blockType];
			form.setValue('hybridAvailableBlocks', newAvailableBlocks);
		}
		remove(blockIndex);
	};

	const getBlock = (value: HybridBlock): (typeof BLOCKS)[number] => {
		const block = BLOCKS.find((b) => b.value === value);
		if (!block) throw new Error(`Invalid block type: ${value}`);
		return block;
	};

	return {
		handleDragEnd,
		handleRemoveBlock,
		handleAddBlock,
		getBlock,
		ORDERED_BLOCKS,
		form,
		fields,
		watchedAvailableBlocks,
	};
};
