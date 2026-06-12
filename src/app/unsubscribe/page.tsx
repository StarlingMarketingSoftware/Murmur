import { verifyUnsubscribeToken } from '@/app/api/_utils/unsubscribe';
import MurmurLogoNew from '@/components/atoms/_svg/MurmurLogoNew';
import { unsubscribeAction } from './actions';

// Public unsubscribe page linked from cold-outreach emails (and the
// List-Unsubscribe header's GET fallback).
export const dynamic = 'force-dynamic';

export default async function UnsubscribePage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string; done?: string }>;
}) {
	const { token, done } = await searchParams;
	const payload = token ? verifyUnsubscribeToken(token) : null;

	let content: React.ReactNode;
	if (!payload) {
		content = (
			<p className="text-stone-600">
				This unsubscribe link is invalid or incomplete. If you copied it from an
				email, make sure the full link was included.
			</p>
		);
	} else if (done === '1') {
		content = (
			<p className="text-stone-600">
				You&#39;ve been unsubscribed. <strong>{payload.email}</strong> will no longer
				receive emails from this sender.
			</p>
		);
	} else {
		content = (
			<>
				<p className="text-stone-600">
					Unsubscribe <strong>{payload.email}</strong> from emails sent by this artist
					through Murmur?
				</p>
				<form action={unsubscribeAction} className="mt-6">
					<input type="hidden" name="token" value={token} />
					<button
						type="submit"
						className="rounded-full bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-stone-700"
					>
						Unsubscribe
					</button>
				</form>
			</>
		);
	}

	return (
		<div className="flex min-h-screen flex-col items-center bg-[#F2F0ED] px-4 py-16">
			<MurmurLogoNew width="140px" height="25px" />
			<div className="mt-10 w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
				<h1 className="mb-4 text-xl font-semibold text-stone-900">Unsubscribe</h1>
				{content}
			</div>
		</div>
	);
}
