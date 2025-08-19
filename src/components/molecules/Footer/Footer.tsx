'use client';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import { usePathname } from 'next/navigation';

export function Footer() {
	const currentYear = new Date().getFullYear();
	const pathname = usePathname();
	
	// Check if we're on pricing or contact (help) pages
	const isLightFooter = pathname === urls.pricing.index || pathname === urls.contact.index;
	
	const footerClass = isLightFooter 
		? "border-t border-gray-200 py-8 bg-white"
		: "border-t border-white/20 py-8 bg-[#2B2B2B]";
	
	const textColorClass = isLightFooter ? "text-black" : "text-white";
	const textMutedClass = isLightFooter ? "text-black/70" : "text-white/70";
	const hoverClass = isLightFooter ? "hover:text-black" : "hover:text-white";

	return (
		<footer className={footerClass}>
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
					<div>
						<h3 className={`font-semibold text-lg mb-4 ${textColorClass}`}>Murmur</h3>
						<p className={textMutedClass}>
							Murmur is for the musicians who want to clear out the clutter of admin work and focus on performing more.
						</p>
					</div>

					<div>
						<h3 className={`font-semibold text-lg mb-4 ${textColorClass}`}>Navigation</h3>
						<ul className="space-y-2">
							<li>
								<Link
									href={urls.home.index}
									className={`${textMutedClass} ${hoverClass} transition-colors`}
								>
									Home
								</Link>
							</li>
							<li>
								<Link
									href={urls.pricing.index}
									className={`${textMutedClass} ${hoverClass} transition-colors`}
								>
									Pricing
								</Link>
							</li>
							<li>
								<Link
									href={urls.contact.index}
									className={`${textMutedClass} ${hoverClass} transition-colors`}
								>
									Help
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className={`border-t ${isLightFooter ? 'border-gray-200' : 'border-white/20'} mt-8 pt-8 text-center ${textMutedClass}`}>
					<p>© {currentYear} Murmur. All rights reserved.</p>
				</div>
			</div>
		</footer>
	);
}
