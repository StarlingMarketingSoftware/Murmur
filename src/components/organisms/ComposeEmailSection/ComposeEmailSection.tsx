import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Brain, PenLine } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FC } from 'react';
import useComposeEmailSection, {
	ComposeEmailSectionProps,
} from './useComposeEmailSection';
import AiCompose from './aiCompose/AiCompose';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Typography } from '@/components/ui/typography';

const ComposeEmailSection: FC<ComposeEmailSectionProps> = (props) => {
	const { campaign, draftingMode, setDraftingMode, modeOptions } =
		useComposeEmailSection(props);

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
					<div className="flex gap-2">
						{modeOptions.map((modeOption) => (
							<div
								key={modeOption.value}
								className="h-8 border-2 border-primary bg-gradient-to-br from-background to-primary/20"
								style={{
									width: `${100 / modeOptions.length}%`,
								}}
							>
								<Typography font="secondary" className="ml-2 text-[20px]">
									{modeOption.label}
								</Typography>
							</div>
						))}
					</div>
					<AiCompose campaign={campaign} />
				</CardContent>
			</Card>
		</>
	);
};

export default ComposeEmailSection;
