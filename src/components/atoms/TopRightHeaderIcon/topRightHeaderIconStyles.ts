import { cn } from '@/utils';

export const TOP_RIGHT_CLERK_AVATAR_CLASS =
	'pointer-events-none absolute inset-0 w-7 h-7 transition-[color,background-color,border-color,box-shadow] duration-150 group-hover:border-black group-hover:bg-[#4A9FFF] group-hover:text-black group-hover:shadow-[0_0_14px_rgba(80,25,45,0.5)] group-focus-within:border-black group-focus-within:bg-[#4A9FFF] group-focus-within:text-black group-focus-within:shadow-[0_0_14px_rgba(80,25,45,0.5)] group-active:border-black group-active:bg-[#4A9FFF] group-active:text-black group-active:shadow-[0_0_14px_rgba(80,25,45,0.5)]';

export function getTopRightSettingsButtonClassName(isOpen: boolean) {
	return cn(
		'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 transition-[color,background-color,border-color] duration-150',
		isOpen
			? 'border-black bg-white text-black'
			: 'border-[#6F6F6F] bg-transparent text-[#6F6F6F] hover:border-black hover:bg-white hover:text-black focus-visible:border-black focus-visible:bg-white focus-visible:text-black'
	);
}
