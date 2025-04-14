import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';

export interface SendingProgressIndicatorProps {
	sendingProgress: number;
	setSendingProgress: Dispatch<SetStateAction<number>>;
	totalEmails: number;
}

export const useSendingProgressIndicator = (props: SendingProgressIndicatorProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const totalEmailsRef = useRef(props.totalEmails);
	console.log(totalEmailsRef.current);
	const { sendingProgress, setSendingProgress } = props;

	const progressPercentage = (props.sendingProgress / totalEmailsRef.current) * 100;
	const isComplete = progressPercentage >= 100;

	useEffect(() => {
		if (sendingProgress >= 0) {
			setIsOpen(true);
		}
	}, [sendingProgress]);

	useEffect(() => {
		if (isOpen) {
			totalEmailsRef.current = props.totalEmails;
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
	};
};
