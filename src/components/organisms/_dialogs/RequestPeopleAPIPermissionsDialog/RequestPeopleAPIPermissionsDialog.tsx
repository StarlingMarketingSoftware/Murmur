import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { LOCAL_STORAGE_KEYS } from '@/constants';
import { Dispatch, FC, SetStateAction } from 'react';

interface RequestPeopleAPIPermissionsDialogProps {
	isOpen: boolean;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
}
const RequestPeopleAPIPermissionsDialog: FC<RequestPeopleAPIPermissionsDialogProps> = ({
	isOpen,
	setIsOpen,
}) => {
	const authorizeGoogle = () => {
		const googleAuthState = Math.random().toString(36).substring(7);
		localStorage.setItem(LOCAL_STORAGE_KEYS.GoogleAuthState, googleAuthState);

		const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
		const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
		const googleOAuth2Url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=https://www.googleapis.com/auth/contacts.readonly&state=${googleAuthState}&prompt=consent`;

		window.location.href = googleOAuth2Url;
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Authorize Murmur with Google</DialogTitle>
				</DialogHeader>
				<DialogDescription className="py-4">{`Murmur requires permission to retrieve your contacts from the Google People API. Please click the "Authorize with Google" button to proceed.`}</DialogDescription>
				<DialogFooter>
					<Button onClick={authorizeGoogle} className="mx-auto">
						Authorize with Google
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default RequestPeopleAPIPermissionsDialog;
