import { cn } from '@/utils';

type OutlinedInitialAvatarProps = {
	initial: string;
	className?: string;
};

export function OutlinedInitialAvatar({ initial, className }: OutlinedInitialAvatarProps) {
	return (
		<div
			aria-hidden="true"
			className={cn(
				'flex items-center justify-center rounded-full border-2 border-[#6F6F6F] bg-transparent text-[#6F6F6F] text-[16px] font-semibold leading-none select-none transition-colors duration-150',
				className
			)}
		>
			{initial}
		</div>
	);
}

