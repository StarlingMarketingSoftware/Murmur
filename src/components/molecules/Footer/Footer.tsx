import Link from 'next/link';
import { urls } from '@/constants/urls';

export function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="border-t py-8 mt-32">
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
					<div>
						<h3 className="font-semibold text-lg mb-4">Murmur</h3>
						<p className="text-muted-foreground">
							AI-powered marketing automation platform that helps you create, manage, and
							optimize your email campaigns effortlessly.
						</p>
					</div>

					<div>
						<h3 className="font-semibold text-lg mb-4">Navigation</h3>
						<ul className="space-y-2">
							<li>
								<Link
									href={urls.home.path}
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									{urls.home.label}
								</Link>
							</li>
							<li>
								<Link
									href={urls.about.path}
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									{urls.about.label}
								</Link>
							</li>
							<li>
								<Link
									href={urls.contact.path}
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									{urls.contact.label}
								</Link>
							</li>
						</ul>
					</div>

					{/* <div>
						<h3 className="font-semibold text-lg mb-4">Legal</h3>
						<ul className="space-y-2">
							<li>
								<Link
									href="/privacy"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Privacy Policy
								</Link>
							</li>
							<li>
								<Link
									href="/terms"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Terms of Service
								</Link>
							</li>
						</ul>
					</div> */}

					{/* <div>
						<h3 className="font-semibold text-lg mb-4">Contact</h3>
						<ul className="space-y-2">
							<Link href={urls.contact.path}>Reach out to us via the contact form.</Link>
						</ul>
					</div> */}
				</div>

				<div className="border-t mt-8 pt-8 text-center text-muted-foreground">
					<p>© {currentYear} Murmur. All rights reserved.</p>
				</div>
			</div>
		</footer>
	);
}
