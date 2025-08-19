import Link from 'next/link';
import { urls } from '@/constants/urls';

interface FooterProps {
	variant?: 'dark' | 'light';
}

export function Footer({ variant = 'dark' }: FooterProps) {
	const currentYear = new Date().getFullYear();

	const isDark = variant === 'dark';
	const bgColor = isDark ? 'bg-[#2B2B2B]' : 'bg-white';
	const borderColor = isDark ? 'border-white/20' : 'border-black/20';
	const headingColor = isDark ? 'text-white' : 'text-black';
	const textColor = isDark ? 'text-white/70' : 'text-black/70';
	const hoverColor = isDark ? 'hover:text-white' : 'hover:text-black';

	return (
		<footer className={`border-t ${borderColor} py-8 ${bgColor}`}>
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
					<div>
						<h3 className={`font-semibold text-lg mb-4 ${headingColor}`}>Murmur</h3>
						<p className={textColor}>
							Murmur is for the musicians who want to clear out the clutter of admin work and focus on performing more.
						</p>
					</div>

					<div>
						<h3 className={`font-semibold text-lg mb-4 ${headingColor}`}>Navigation</h3>
						<ul className="space-y-2">
							<li>
								<Link
									href={urls.home.index}
									className={`${textColor} ${hoverColor} transition-colors`}
								>
									Home
								</Link>
							</li>
							<li>
								<Link
									href={urls.pricing.index}
									className={`${textColor} ${hoverColor} transition-colors`}
								>
									Pricing
								</Link>
							</li>
							<li>
								<Link
									href={urls.contact.index}
									className={`${textColor} ${hoverColor} transition-colors`}
								>
									Help
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className={`border-t ${borderColor} mt-8 pt-8 text-center ${textColor}`}>
					<p>© {currentYear} Murmur. All rights reserved.</p>
				</div>
			</div>
		</footer>
	);
}
