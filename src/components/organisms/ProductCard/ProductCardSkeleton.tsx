import { FC } from 'react';
import { cn } from '@/utils';

const block = 'animate-pulse rounded-md bg-black/10';

/**
 * Loading placeholder that mirrors the `pricing` variant of {@link ProductCard}
 * (same outer/inner dimensions and content positions) so cards swap in without
 * any layout shift.
 */
export const ProductCardSkeleton: FC = () => {
	return (
		<div
			aria-hidden="true"
			className={cn(
				'relative h-[454px] w-[359px] shrink-0 overflow-hidden',
				'rounded-[14px] border-[2px] border-black/10 bg-gray-100'
			)}
		>
			<div
				className="absolute top-[18px] left-1/2 -translate-x-1/2 rounded-[6.621px] bg-white"
				style={{ width: 342, height: 427 }}
			>
				{/* Title + price */}
				<div className="absolute top-[20px] left-[19px]">
					<div className={cn(block, 'h-[23px] w-[88px]')} />
					<div className="mt-[19px] flex items-end gap-[8px]">
						<div className={cn(block, 'h-[46px] w-[128px]')} />
						<div className={cn(block, 'mb-[6px] h-[18px] w-[64px]')} />
					</div>
				</div>

				{/* Button */}
				<div
					className={cn(block, 'absolute top-[133px] left-0 h-[68px] w-full rounded-[6.621px]')}
				/>

				{/* Features */}
				<div className="absolute top-[227px] right-[19px] left-[19px] flex flex-col gap-[27px]">
					<div className={cn(block, 'h-[15px] w-full')} />
					<div className={cn(block, 'h-[15px] w-[72%]')} />
					<div className={cn(block, 'h-[15px] w-[88%]')} />
				</div>
			</div>
		</div>
	);
};
