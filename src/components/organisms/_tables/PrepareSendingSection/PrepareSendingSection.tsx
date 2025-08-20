import EmailsTable from '../EmailsTable/EmailsTable';
import { FC } from 'react';
import {
	PrepareSendingSectionProps,
	usePrepareSendingSection,
} from './usePrepareSendingSection';
import { ConfirmSendDialog } from '../../_dialogs/ConfirmSendDialog/ConfirmSendDialog';
import ProgressIndicator from '@/components/molecules/ProgressIndicator/ProgressIndicator';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';

export const PrepareSendingSection: FC<PrepareSendingSectionProps> = (props) => {
	const {
		campaign,
		draftEmails,
		isPendingEmails,
		sendingProgress,
		setSendingProgress,
		sentEmails,
		isSendingDisabled,
		isFreeTrial,
	} = usePrepareSendingSection(props);

	if (draftEmails.length === 0 && sentEmails.length === 0) {
		return null;
	}

	if (isPendingEmails) {
		return <Spinner />;
	}

	return (
		<div className="w-full">
			<EmailsTable
				emails={draftEmails}
				isPending={isPendingEmails}
				noDataMessage="No draft emails were found."
				isEditable
			/>
			<div className="flex justify-center mt-6">
				{isSendingDisabled ? (
					<UpgradeSubscriptionDrawer
						triggerButtonText="Proceed to Sending Confirmation"
						message={
							isFreeTrial
								? `Your free trial subscription does not include the ability to send emails. To send the emails you've drafted, please upgrade your subscription to the paid version.`
								: `You have run out of sending credits. Please upgrade your subscription to a higher tier to receive more sending credits.`
						}
					/>
				) : (
					<ConfirmSendDialog
						setSendingProgress={setSendingProgress}
						campaign={campaign}
						draftEmails={draftEmails}
					/>
				)}
			</div>
			<ProgressIndicator
				progress={sendingProgress}
				total={draftEmails.length}
				setProgress={setSendingProgress}
				pendingMessage="Sending {{progress}} emails..."
				completeMessage="Finished sending {{progress}} emails."
			/>
		</div>
	);
};
