import { SignUp } from '@clerk/nextjs';
import { AuthPageLayout } from '../../AuthPageLayout';

export default function SignUpPage() {
	return (
		<AuthPageLayout>
			<SignUp
				appearance={{
					elements: {
						formButtonPrimary: 'bg-black hover:bg-gray-800 text-sm normal-case',
					},
				}}
				path="/sign-up"
				routing="path"
				signInUrl="/sign-in"
			/>
		</AuthPageLayout>
	);
}
