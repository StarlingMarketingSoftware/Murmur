import { FC } from 'react';
import { ProgressIndicatorProps, useProgressIndicator } from './useProgressIndicator';
import { Progress } from '@/components/ui/progress';
import { Typography } from '@/components/ui/typography';
import { BanIcon, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Spinner from '@/components/ui/spinner';

const ProgressIndicator: FC<ProgressIndicatorProps> = (props) => {
	const {
		progress: sendingProgress,
		progressPercentage,
		isComplete,
		isOpen,
		setIsOpen,
		finalPendingMessage,
		finalCompleteMessage,
		cancelAction,
	} = useProgressIndicator(props);

	if (sendingProgress < 0 || !isOpen) {
		return null;
	}

	return (
		<div className="border-border border-[1px] rounded-md p-4 fixed bottom-5 w-[90vw] md:w-[45vw] md:min-w-[500px] max-w-[600px] bg-background z-20 left-1/2 transform -translate-x-1/2">
			<Button
				onClick={() => setIsOpen(false)}
				variant="ghost"
				className="absolute top-2 right-2"
				size="icon"
			>
				<X size="20px" className="text-muted" />
			</Button>
			<div className="flex flex-row items-center gap-2">
				<Typography variant="label" font="secondary" className="!text-sm">
					{isComplete ? finalCompleteMessage : finalPendingMessage}
				</Typography>
				{isComplete ? (
					<CheckCircle2 size="20px" className="text-success" />
				) : (
					<>
						<Spinner size="small" className="!m-0 min-h-[20px]" />
						{cancelAction && (
							<Button
								size="sm"
								font="secondary"
								className="text-xs text-muted"
								onClick={cancelAction}
								variant="ghost"
							>
								<BanIcon className="text-destructive" /> Cancel
							</Button>
						)}
					</>
				)}
			</div>
			<Progress value={progressPercentage} className="w-full mt-3" />
		</div>
	);
};

export default ProgressIndicator;
