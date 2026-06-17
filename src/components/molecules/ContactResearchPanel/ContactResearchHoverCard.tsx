'use client';

import { CSSProperties, FC, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils';
import { ContactWithName } from '@/types/contact';
import { useContactWithResearch } from '@/hooks/queryHooks/useContacts';
import { ContactResearchPanel } from './ContactResearchPanel';
import { ContactResearchDescriptionBox } from './ContactResearchDescriptionBox';

const HOVER_CARD_GAP_PX = 13;

interface ContactResearchHoverCardProps {
	contact: ContactWithName | null | undefined;
	displayHeadline?: string;
	displayTitleCategory?: string;
	/** Controlled expand state. Omit to let the card own it (Tab toggles). */
	expanded?: boolean;
	onExpandedChange?: (next: boolean) => void;
	className?: string;
	style?: CSSProperties;
}

/**
 * The full contact research hover card: the abridged {@link ContactResearchPanel}
 * stacked above the "Description / Press Tab to Expand" box. Lazily backfills the
 * hovered contact's research fields and, when uncontrolled, toggles the Description
 * box on Tab while it's mounted — so any row/marker hover surface gets the same
 * card the dashboard map-marker hover shows.
 */
export const ContactResearchHoverCard: FC<ContactResearchHoverCardProps> = ({
	contact,
	displayHeadline,
	displayTitleCategory,
	expanded,
	onExpandedChange,
	className,
	style,
}) => {
	const enriched = useContactWithResearch(contact ?? null);
	const isControlled = expanded !== undefined;
	const [internalExpanded, setInternalExpanded] = useState(false);
	const isExpanded = expanded ?? internalExpanded;

	const onExpandedChangeRef = useRef(onExpandedChange);
	onExpandedChangeRef.current = onExpandedChange;

	// Tab toggles the Description box while the card is mounted (mounted only while a
	// contact is hovered, so Tab is inert otherwise). A controlled parent owns Tab.
	useEffect(() => {
		if (isControlled) return;
		const handleResearchTabToggle = (event: KeyboardEvent) => {
			if (event.key !== 'Tab') return;
			const target = event.target as HTMLElement | null;
			if (
				target &&
				(target.isContentEditable ||
					['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
			) {
				return;
			}
			event.preventDefault();
			setInternalExpanded((prev) => {
				const next = !prev;
				onExpandedChangeRef.current?.(next);
				return next;
			});
		};
		window.addEventListener('keydown', handleResearchTabToggle);
		return () => window.removeEventListener('keydown', handleResearchTabToggle);
	}, [isControlled]);

	return (
		<div className={cn('flex flex-col items-center', className)} style={style}>
			<ContactResearchPanel
				contact={enriched}
				variant="abridged"
				displayHeadline={displayHeadline}
				displayTitleCategory={displayTitleCategory}
			/>
			<ContactResearchDescriptionBox
				style={{ marginTop: `${HOVER_CARD_GAP_PX}px` }}
				metadata={enriched?.metadata}
				fallbackText={enriched?.headline || ''}
				expanded={isExpanded}
			/>
		</div>
	);
};
