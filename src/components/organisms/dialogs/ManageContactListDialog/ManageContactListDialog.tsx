import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { FC } from 'react';
import Spinner from '@/components/ui/spinner';
import {
	ManageContactListDialogProps,
	useManageContactListDialog,
} from './useManageContactListDialog';
import CustomTable from '@/app/murmur/campaign/[campaignId]/_components/CustomTable';

export const ManageContactListDialog: FC<ManageContactListDialogProps> = (props) => {
	const {
		isPending,
		data,
		isOpen,
		setIsOpen,
		columns,
		selectedContactList,
		saveSelectedRecipients,
	} = useManageContactListDialog(props);
	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]">
				{isPending || !data ? (
					<Spinner />
				) : (
					<>
						<DialogTitle className="capitalize">
							{`Manage "${selectedContactList?.name}"`}
						</DialogTitle>
						<DialogHeader></DialogHeader>
						<CustomTable
							columns={columns}
							data={data}
							noDataMessage="There are no contacts in this contact list."
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
