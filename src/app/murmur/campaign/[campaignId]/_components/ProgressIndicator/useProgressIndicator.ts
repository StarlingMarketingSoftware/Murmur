import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';

/**
 * Props for the ProgressIndicator component.
 * Handles the display and state management of a progress bar.
 * @example
 * <ProgressIndicator
 *   progress={5}
 *   total={10}
 *   pendingMessage="Sending {{progress}} emails..."
 * />
 */

export interface ProgressIndicatorProps {
	progress: number;
	setProgress: Dispatch<SetStateAction<number>>;
	total: number;
	pendingMessage?: string;
	completeMessage?: string;
	cancelAction?: () => void;
}

export const useProgressIndicator = (props: ProgressIndicatorProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const totalEmailsRef = useRef(props.total);
	const { progress: sendingProgress, setProgress: setSendingProgress } = props;
	const { pendingMessage = '{{progress}}', completeMessage = '{{progress}}' } = props;
	const progressPercentage = (props.progress / totalEmailsRef.current) * 100;
	const isComplete = progressPercentage >= 100;
	const progressText = ` ${sendingProgress}/${totalEmailsRef.current} `;

	const insertProgressTextIntoMessage = (message: string, progressText: string) => {
		return message.replace(/{{progress}}/g, progressText);
	};

	const finalPendingMessage = insertProgressTextIntoMessage(pendingMessage, progressText);
	const finalCompleteMessage = insertProgressTextIntoMessage(
		completeMessage,
		progressText
	);

	useEffect(() => {
		if (sendingProgress >= 0) {
			setIsOpen(true);
		}
	}, [sendingProgress]);

	useEffect(() => {
		if (isOpen) {
			totalEmailsRef.current = props.total;
		} else {
			setSendingProgress(-1);
		}
		/* eslint-disable react-hooks/exhaustive-deps */
	}, [isOpen, setSendingProgress]);

	return {
		...props,
		progressPercentage,
		isComplete,
		setIsOpen,
		isOpen,
		totalEmailsRef,
		finalPendingMessage,
		finalCompleteMessage,
	};
};
