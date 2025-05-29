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
import Spinner from '@/components/ui/spinner';
import {
	SelectRecipientsDialogProps,
	useSelectRecipientsDialog,
} from './useSelectRecipientsDialog';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import { SaveIcon } from 'lucide-react';

const SelectRecipientsDialog: FC<SelectRecipientsDialogProps> = (props) => {
	const {
		isPending,
		isOpen,
		setIsOpen,
		columns,
		setSelectedRows,
		selectedContactList,
		saveSelectedRecipients,
		filteredData,
	} = useSelectRecipientsDialog(props);
	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]">
				<DialogTitle className="capitalize"></DialogTitle>
				{isPending || !filteredData ? (
					<Spinner />
				) : (
					<>
						<DialogTitle className="capitalize">
							{`${selectedContactList?.name}`}
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
							isSelectable
							noDataMessage="All contacts in this list have been added to your campaign already!"
						/>
						<DialogFooter>
							<Button onClick={saveSelectedRecipients}>
								<SaveIcon />
								Save Selected Recipients
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default SelectRecipientsDialog;
