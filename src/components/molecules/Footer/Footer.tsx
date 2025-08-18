import Link from 'next/link';
import { urls } from '@/constants/urls';

export function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="border-t py-8 bg-background">
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
					<div>
						<h3 className="font-semibold text-lg mb-4">Murmur</h3>
						<p className="text-muted">
							Murmur is for the musicians who want to clear out the clutter of admin work and focus on performing more.
						</p>
					</div>

					<div>
						<h3 className="font-semibold text-lg mb-4">Navigation</h3>
						<ul className="space-y-2">
							<li>
								<Link
									href={urls.home.index}
									className="text-muted hover:text-foreground transition-colors"
								>
									Home
								</Link>
							</li>
							<li>
								<Link
									href={urls.pricing.index}
									className="text-muted hover:text-foreground transition-colors"
								>
									Pricing
								</Link>
							</li>
							<li>
								<Link
									href={urls.contact.index}
									className="text-muted hover:text-foreground transition-colors"
								>
									Help
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="border-t mt-8 pt-8 text-center text-muted">
					<p>© {currentYear} Murmur. All rights reserved.</p>
				</div>
			</div>
		</footer>
	);
}
