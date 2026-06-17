'use client';

import { UserButton } from '@clerk/nextjs';
import { withClerkNoBranding } from '@/constants/auth';
import { OutlinedInitialAvatar } from '@/components/atoms/OutlinedInitialAvatar/OutlinedInitialAvatar';
import { TOP_RIGHT_CLERK_AVATAR_CLASS } from './topRightHeaderIconStyles';

type TopRightClerkButtonProps = {
	initial: string;
};

export function TopRightClerkButton({ initial }: TopRightClerkButtonProps) {
	return (
		<div className="group relative h-7 w-7 cursor-pointer">
			<OutlinedInitialAvatar initial={initial} className={TOP_RIGHT_CLERK_AVATAR_CLASS} />
			<div className="absolute inset-0 opacity-0">
				<UserButton
					appearance={withClerkNoBranding({
						elements: {
							avatarBox: 'w-7 h-7',
							userButtonTrigger: 'w-7 h-7 p-0',
						},
					})}
				/>
			</div>
		</div>
	);
}
