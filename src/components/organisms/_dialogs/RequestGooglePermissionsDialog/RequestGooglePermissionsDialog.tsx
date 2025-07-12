import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';

const RequestGooglePermissionsDialog = () => {
	const authorizeGoogle = () => {
		// const googleOAuth2Url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=token&scope=https://www.googleapis.com/auth/contacts.readonly`;

		window.location.href = 'https://example.com';
	};

	// see if user already has OAuth token, and verify if it is still valid. If not, this dialogue is defaultOpen

	return (
		<Dialog defaultOpen modal>
			<DialogTrigger asChild>
				<Button variant="primary-light">Authorize Murmur with Google</Button>
			</DialogTrigger>
			<DialogContent hideCloseButton className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Authorize Murmur with Google Permissions</DialogTitle>
				</DialogHeader>
				<DialogDescription className="py-4">{`Murmur uses the Google People API and Gmail API to retrieve your contacts and send email. For these functions, we require you to provide Murmur with permissions to use these APIs with your Google account. Please click the "Authorize with Google" with button to proceed.`}</DialogDescription>
				<DialogFooter>
					<Button onClick={authorizeGoogle} className="mx-auto">
						Authorize with Google
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default RequestGooglePermissionsDialog;
