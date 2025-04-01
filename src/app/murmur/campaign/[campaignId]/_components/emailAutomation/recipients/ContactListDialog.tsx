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
import { Label } from '@/components/ui/label';
import { ContactList } from '@prisma/client';
import { FC } from 'react';
import { ContactListDialogProps, useContactListDialog } from './useRecipientsPage';
import Spinner from '@/components/ui/spinner';
import CustomTable from '../../CustomTable';

const ContactListDialog: FC<ContactListDialogProps> = (props) => {
	const {
		data,
		isPending,
		isOpen,
		setIsOpen,
		columns,
		setSelectedRows,
		selectedContactList,
	} = useContactListDialog(props);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]">
				{isPending ? (
					<Spinner />
				) : (
					<>
						<DialogHeader>
							<DialogTitle className="capitalize">
								{`Select Recipients from ${selectedContactList?.category}`}
							</DialogTitle>
							<DialogDescription>
								Select recipients from the table, then save them to your campaign.
							</DialogDescription>
						</DialogHeader>
						<CustomTable
							columns={columns}
							data={data}
							setSelectedRows={setSelectedRows}
						/>
						<DialogFooter>
							<Button>Save Recipients</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default ContactListDialog;
