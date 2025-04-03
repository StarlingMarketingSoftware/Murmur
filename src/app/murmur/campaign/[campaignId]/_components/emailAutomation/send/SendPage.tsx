import { FC } from 'react';
import { PrepareSendingTable } from './PrepareSendingTable/PrepareSendingTable';
import { SendPageProps, useSendPage } from './useSendPage';
import Spinner from '@/components/ui/spinner';

const SendPage: FC<SendPageProps> = (props) => {
	const { dataEmails, campaign, isPendingEmails } = useSendPage(props);

	if (isPendingEmails) {
		return <Spinner />;
	}

	return (
		<>
			<PrepareSendingTable campaign={campaign} emails={dataEmails!} />
		</>
	);
};

export default SendPage;
