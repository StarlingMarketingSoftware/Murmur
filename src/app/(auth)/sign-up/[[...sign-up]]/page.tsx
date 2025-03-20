import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-100">
			<div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
				<div className="text-center">
					<h1 className="text-3xl font-bold">Sign Up</h1>
					<p className="mt-2 text-gray-600">Create your Murmur account</p>
				</div>
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
			</div>
		</div>
	);
}
