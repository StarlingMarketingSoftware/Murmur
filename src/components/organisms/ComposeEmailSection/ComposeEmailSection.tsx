import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FC } from 'react';
import useComposeEmailSection, {
	ComposeEmailSectionProps,
} from './useComposeEmailSection';
import AiCompose from './aiCompose/AiCompose';
import { BlockTabs } from '@/components/atoms/BlockTabs/BlockTabs';

const ComposeEmailSection: FC<ComposeEmailSectionProps> = (props) => {
	const { campaign, draftingMode, setDraftingMode, modeOptions } =
		useComposeEmailSection(props);

	return (
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
	);
};

export default ComposeEmailSection;
