import { FC } from 'react';
import {
	SendingProgressIndicatorProps,
	useSendingProgressIndicator,
} from './useSendingProgressIndicator';
import { Progress } from '@/components/ui/progress';
import { TypographySmall } from '@/components/ui/typography';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Spinner from '@/components/ui/spinner';

const SendingProgressIndicator: FC<SendingProgressIndicatorProps> = (props) => {
	const {
		sendingProgress,
		progressPercentage,
		isComplete,
		isOpen,
		setIsOpen,
		totalEmailsRef,
	} = useSendingProgressIndicator(props);

	if (sendingProgress < 0 || !isOpen) {
		return null;
	}

	return (
		<div className="border-border border-[1px] rounded-md p-4 fixed bottom-5 w-[45vw]  min-w-[300px] max-w-[600px] bg-background z-10 left-1/2 transform -translate-x-1/2">
			<Button
				onClick={() => setIsOpen(false)}
				variant="ghost"
				className="absolute top-2 right-2"
				size="icon"
			>
				<X size="20px" className="text-primary" />
			</Button>
			<div className="flex flex-row items-center gap-2">
				<TypographySmall className="">{`${
					isComplete ? 'Finished sending' : 'Sending'
				} ${sendingProgress}/${totalEmailsRef.current} emails.`}</TypographySmall>
				{isComplete ? (
					<CheckCircle2 size="20px" className="text-success animate-pulse" />
				) : (
					<Spinner size="small" className="mx-0 min-h-[20px]" />
				)}
			</div>
			<Progress value={progressPercentage} className="w-full mt-3" />
		</div>
	);
};

export default SendingProgressIndicator;
