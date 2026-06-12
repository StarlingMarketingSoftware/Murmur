import { SignUp } from '@clerk/nextjs';
import { AuthPageLayout } from '../../../AuthPageLayout';
import { AccountType } from '@/constants/prismaEnums';
import { urls } from '@/constants/urls';

const VENUE_SIGN_UP_METADATA = { accountType: AccountType.venue } as const;

export default function VenueSignUpPage() {
	return (
		<AuthPageLayout>
			<SignUp
				appearance={{
					elements: {
						formButtonPrimary: 'bg-black hover:bg-gray-800 text-sm normal-case',
					},
				}}
				path={urls.signUp.venue}
				routing="path"
				signInUrl={urls.signIn.index}
				forceRedirectUrl={urls.venuePortal.index}
				fallbackRedirectUrl={urls.venuePortal.index}
				signInForceRedirectUrl={urls.venuePortal.index}
				signInFallbackRedirectUrl={urls.venuePortal.index}
				unsafeMetadata={VENUE_SIGN_UP_METADATA}
			/>
		</AuthPageLayout>
	);
}
