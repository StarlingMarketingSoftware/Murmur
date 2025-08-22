'use client';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import { usePathname } from 'next/navigation';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils';

export function Footer() {
	const currentYear = new Date().getFullYear();
	const pathname = usePathname();

	const isLightFooter =
		pathname === urls.pricing.index || pathname === urls.contact.index;

	const footerClass = isLightFooter
		? 'border-t border-gray-200 py-8 bg-background'
		: 'border-t border-background/20 py-8 bg-[#2B2B2B]';

	const textColorClass = isLightFooter ? 'text-black' : 'text-background';
	const textMutedClass = isLightFooter ? 'text-black/70' : 'text-background/70';
	const hoverClass = isLightFooter ? 'hover:text-black' : 'hover:text-background';

	return (
		<footer className={footerClass}>
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
					<div>
						<Typography
							variant="h3"
							className={cn('font-semibold text-lg mb-4 font-secondary', textColorClass)}
						>
							Murmur
						</Typography>
						<p className={textMutedClass}>
							Murmur is for the musicians who want to clear out the clutter of admin work
							and focus on performing more.
						</p>
					</div>

					<div>
						<Typography
							variant="h3"
							className={cn('font-semibold text-lg mb-4 font-secondary', textColorClass)}
						>
							Navigation
						</Typography>
						<ul className="space-y-2">
							<li>
								<Link
									href={urls.home.index}
									className={cn(textMutedClass, hoverClass, 'transition-colors')}
								>
									Home
								</Link>
							</li>
							<li>
								<Link
									href={urls.pricing.index}
									className={cn(textMutedClass, hoverClass, 'transition-colors')}
								>
									Pricing
								</Link>
							</li>
							<li>
								<Link
									href={urls.contact.index}
									className={cn(textMutedClass, hoverClass, 'transition-colors')}
								>
									Help
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div
					className={cn(
						'border-t mt-8 pt-8 text-center',
						isLightFooter ? 'border-gray-200' : 'border-background/20',
						textMutedClass
					)}
				>
					<p>© {currentYear} Murmur. All rights reserved.</p>
				</div>
			</div>
		</footer>
	);
}
