'use client';
import { useMe } from '@/hooks/useMe';
import { CreditCardIcon } from 'lucide-react';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { useClerk } from '@clerk/nextjs';

const AiCredits = () => {
	const { user, isPendingUser } = useMe();
	const { isSignedIn } = useClerk();

	if (!isSignedIn) return null;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex items-center justify-center gap-2 w-[90px]">
						{isPendingUser ? (
							<Spinner size="small" />
						) : (
							<CreditCardIcon className="text-primary" />
						)}
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
