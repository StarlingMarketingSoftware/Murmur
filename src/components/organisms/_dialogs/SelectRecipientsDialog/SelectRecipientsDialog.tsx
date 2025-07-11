import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { FC } from 'react';
import Spinner from '@/components/ui/spinner';
import {
	SelectRecipientsDialogProps,
	useSelectRecipientsDialog,
} from './useSelectRecipientsDialog';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';

const SelectRecipientsDialog: FC<SelectRecipientsDialogProps> = (props) => {
	const { isPending, isOpen, setIsOpen, columns, data, selectedContactList } =
		useSelectRecipientsDialog(props);
	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]">
				<DialogTitle className="capitalize"></DialogTitle>
				{isPending ? (
					<Spinner />
				) : (
					<>
						<DialogTitle className="capitalize">
							{`${selectedContactList?.name}`}
						</DialogTitle>
						<CustomTable
							columns={columns}
							data={data?.contacts}
							noDataMessage="All contacts in this list have been added to your campaign already!"
						/>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default SelectRecipientsDialog;
