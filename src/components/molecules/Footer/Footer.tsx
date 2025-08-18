import Link from 'next/link';
import { urls } from '@/constants/urls';

export function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="border-t border-white/20 py-8 bg-[#2B2B2B]">
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
					<div>
						<h3 className="font-semibold text-lg mb-4 text-white">Murmur</h3>
						<p className="text-white/70">
							Murmur is for the musicians who want to clear out the clutter of admin work and focus on performing more.
						</p>
					</div>

					<div>
						<h3 className="font-semibold text-lg mb-4 text-white">Navigation</h3>
						<ul className="space-y-2">
							<li>
								<Link
									href={urls.home.index}
									className="text-white/70 hover:text-white transition-colors"
								>
									Home
								</Link>
							</li>
							<li>
								<Link
									href={urls.pricing.index}
									className="text-white/70 hover:text-white transition-colors"
								>
									Pricing
								</Link>
							</li>
							<li>
								<Link
									href={urls.contact.index}
									className="text-white/70 hover:text-white transition-colors"
								>
									Help
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="border-t border-white/20 mt-8 pt-8 text-center text-white/70">
					<p>© {currentYear} Murmur. All rights reserved.</p>
				</div>
			</div>
		</footer>
	);
}
