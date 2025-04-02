import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
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
		saveSelectedRecipients,
		filteredData,
	} = useContactListDialog(props);
	console.log('🚀 ~ filteredData:', filteredData);
	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]">
				<DialogTitle className="capitalize"></DialogTitle>
				{isPending || !filteredData ? (
					<Spinner />
				) : (
					<>
						<DialogTitle className="capitalize">
							{`${selectedContactList?.category}`}
						</DialogTitle>
						<DialogHeader>
							<DialogDescription>
								Select recipients from the table, then save them to your campaign.
							</DialogDescription>
						</DialogHeader>
						<CustomTable
							columns={columns}
							data={filteredData}
							setSelectedRows={setSelectedRows}
							noDataMessage="All contacts in this list have been added to your campaign already!"
						/>
						<DialogFooter>
							<Button onClick={saveSelectedRecipients}>Save Selected Recipients</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default ContactListDialog;
