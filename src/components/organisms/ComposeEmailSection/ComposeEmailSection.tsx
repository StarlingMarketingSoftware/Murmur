import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FC } from 'react';
import useComposeEmailSection, {
	ComposeEmailSectionProps,
} from './useComposeEmailSection';
import AiCompose from './aiCompose/AiCompose';

const ComposeEmailSection: FC<ComposeEmailSectionProps> = (props) => {
	const { campaign } = useComposeEmailSection(props);

	return (
		<>
			{campaign?.contactLists.length === 0 && (
				<Alert variant="warning">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>No Recipients</AlertTitle>
					<AlertDescription>
						You have not selected any recipients for this campaign.
					</AlertDescription>
				</Alert>
			)}
			<Card>
				<CardContent className="space-y-2">
					{/* <ToggleGroup
					// onClick={handleModeClick}
					variant="primary-light"
					className="mx-auto"
					type="single"
					size="lg"
					value={isAiDraft ? 'ai' : 'compose'}
					onValueChange={(value) => {
						setIsAiDraft(value === 'ai');
						setIsAiSubject(value === 'ai');
					}}
				>
					<ToggleGroupItem value="ai">
						<Brain />
						AI Draft
					</ToggleGroupItem>

					<ToggleGroupItem value="compose" disabled>
						<PenLine />
						Compose
					</ToggleGroupItem>
				</ToggleGroup> */}
					<AiCompose campaign={campaign} />
				</CardContent>
			</Card>
		</>
	);
};

export default ComposeEmailSection;
