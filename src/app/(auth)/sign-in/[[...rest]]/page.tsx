import { SignIn } from '@clerk/nextjs';
import { AuthPageLayout } from '../../AuthPageLayout';

export default function SignInPage() {
	return (
		<AuthPageLayout>
			<SignIn
				appearance={{
					elements: {
						formButtonPrimary: 'bg-black hover:bg-gray-800 text-sm normal-case',
					},
				}}
				path="/sign-in"
				routing="path"
				signUpUrl="/sign-up"
			/>
		</AuthPageLayout>
	);
}
