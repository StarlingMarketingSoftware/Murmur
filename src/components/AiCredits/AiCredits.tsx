'use client';
import { useMe } from '@/hooks/useMe';
import { CreditCardIcon } from 'lucide-react';
import Spinner from '../ui/spinner';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';

const AiCredits = () => {
	const { user, isPendingUser } = useMe();

	if (isPendingUser) return <Spinner size="small" />;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex gap-2">
						<CreditCardIcon className="text-primary" />
						{user?.aiDraftCredits}
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>Your AI Draft Credits</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};

export default AiCredits;
