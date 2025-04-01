import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card';
import { FC, useState } from 'react';
import CustomTable from '../../CustomTable';
import { Button } from '@/components/ui/button';
import { ContactList } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import RequestPeopleAPIPermissionsDialog from '../../RequestPeopleAPIPermissionsDialog';
import { LocalStorageKeys } from '@/constants/constants';
import { hasContactsReadOnlyPermission } from '@/app/utils/googlePermissions';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
	setSelectedContactLists,
	setStep2,
} from '@/lib/redux/features/murmur/murmurSlice';
import ContactListDialog from './ContactListDialog';

interface SelectRecipientsStep1Props {
	contactLists: ContactList[];
}

const SelectRecipientsStep1: FC<SelectRecipientsStep1Props> = ({ contactLists }) => {
	const selectedContactLists = useAppSelector(
		(state) => state.murmur.recipients.selectedContactLists
	);
	console.log('🚀 ~ selectedContactLists:', selectedContactLists);
	const dispatch = useAppDispatch();

	return (
		<Card>
			<CardHeader>
				<CardDescription>
					Select a list to manage or import from Google Contacts.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				<CustomTable
					columns={columns}
					data={contactLists}
					setSelectedRows={handleSelectedRowsChange}
					initialRowSelectionState={selectedContactLists}
				/>
			</CardContent>
			<ContactListDialog />
			{/* <Button
				onClick={handleImportGoogleContacts}
				variant="outline"
				className="w-fit mx-auto flex items-center gap-2"
			>
				<FcGoogle />
				Import your Google Contacts
			</Button>
			<Button
				onClick={() => dispatch(setStep2(true))}
				disabled={selectedContactLists.length === 0}
				className="w-fit max-w-[500px] mx-auto"
			>
				Extract Contacts from Selected Lists
			</Button>
			<RequestPeopleAPIPermissionsDialog
				isOpen={isPermissionsDialogOpen}
				setIsOpen={setIsPermissionsDialogOpen}
			/> */}
		</Card>
	);
};

export default SelectRecipientsStep1;
