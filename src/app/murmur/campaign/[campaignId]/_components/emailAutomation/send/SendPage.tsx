import { FC } from 'react';
import { PrepareSendingTable } from './PrepareSendingTable/PrepareSendingTable';
import { SendPageProps, useSendPage } from './useSendPage';
import Spinner from '@/components/ui/spinner';
import { SentEmailsTable } from './SentEmailsTable/SentEmailsTable';

const SendPage: FC<SendPageProps> = (props) => {
	const { dataEmails, campaign, isPendingEmails } = useSendPage(props);

	if (isPendingEmails) {
		return <Spinner />;
	}

	return (
		<>
			<PrepareSendingTable
				campaign={campaign}
				emails={dataEmails!}
				isPending={isPendingEmails}
			/>
			<SentEmailsTable emails={dataEmails!} isPending={isPendingEmails} />
		</>
	);
};

export default SendPage;
