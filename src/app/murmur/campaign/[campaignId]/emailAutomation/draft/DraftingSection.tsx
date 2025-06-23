import { FC } from 'react';
import EmailsTable from '../../../../../../components/organisms/_tables/EmailsTable/EmailsTable';
import { Card, CardContent } from '@/components/ui/card';
import { DraftingSectionProps, useDraftingSection } from './useDraftingSection';
import Spinner from '@/components/ui/spinner';
import { DraftingRightPanel } from '@/components/organisms/DraftingRightPanel/DraftingRightPanel';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BlockTabs } from '@/components/atoms/BlockTabs/BlockTabs';
import AiCompose from '@/components/organisms/ComposeEmailSection/aiCompose/AiCompose';

export const DraftingSection: FC<DraftingSectionProps> = (props) => {
	const {
		draftEmails,
		isPending,
		campaign,

		isAiDraft,
		setIsAiDraft,
		draftingMode,
		setDraftingMode,
		modeOptions,
	} = useDraftingSection(props);

	if (isPending) {
		return <Spinner />;
	}

	return (
		<>
			<div className="flex gap-4">
				<div className="w-1/2">
					<div className="mt-6">
						{campaign?.contactLists.length === 0 && (
							<Alert variant="warning">
								<AlertCircle className="h-4 w-4" />
								<AlertTitle>No Recipients</AlertTitle>
								<AlertDescription>
									You have not selected any recipients for this campaign.
								</AlertDescription>
							</Alert>
						)}
						<BlockTabs
							options={modeOptions}
							activeValue={draftingMode}
							onValueChange={setDraftingMode}
						/>
						<AiCompose campaign={campaign} />
					</div>
				</div>
				<div className="w-1/2">
					<DraftingRightPanel campaign={campaign} />
				</div>
			</div>
			<Card className="relative">
				<CardContent>
					<EmailsTable
						isEditable
						emails={draftEmails}
						isPending={isPending}
						noDataMessage="Drafts will appear here as they are created."
					/>
				</CardContent>
			</Card>
		</>
	);
};
