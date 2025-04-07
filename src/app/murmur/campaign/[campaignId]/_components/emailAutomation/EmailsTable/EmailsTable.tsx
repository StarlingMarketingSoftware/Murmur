import { FC } from 'react';
import CustomTable from '../../CustomTable';
import { EmailsTableProps, useEmailsTable } from './useEmailsTable';
import Spinner from '@/components/ui/spinner';
import ViewEditEmailDialog from '@/app/murmur/_components/ViewEditEmailDialog/ViewEditEmailDialog';

const EmailsTable: FC<EmailsTableProps> = (props) => {
	const {
		columns,
		handleRowClick,
		isDraftDialogOpen,
		setIsDraftDialogOpen,
		selectedDraft,
		isPendingDeleteEmail,
		emails,
		isPending,
		noDataMessage,
		isEditable,
	} = useEmailsTable(props);

	if (isPending) {
		return <Spinner />;
	}

	return (
		<>
			{isPendingDeleteEmail && (
				<Spinner size="medium" className="absolute top-2 right-2" />
			)}
			<CustomTable
				columns={columns}
				data={emails}
				singleSelection
				noDataMessage={noDataMessage || 'No emails were found.'}
				handleRowClick={handleRowClick}
			/>
			<ViewEditEmailDialog
				email={selectedDraft}
				isOpen={isDraftDialogOpen}
				setIsOpen={setIsDraftDialogOpen}
				isEditable={isEditable}
			/>
		</>
	);
};

export default EmailsTable;
