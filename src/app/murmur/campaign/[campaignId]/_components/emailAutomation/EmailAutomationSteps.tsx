import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SelectRecipients from './recipients/Recipients';
import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';
import DraftPage from './draft/DraftPage';
import Send from './send/Send';
import { useEmailAutomationSteps } from './useEmailAutomationSteps';

type Step = {
	step: number;
	value: string;
	label: string;
	component: ReactNode;
};

const steps: Step[] = [
	{
		step: 1,
		value: 'recipients',
		label: 'Recipients',
		component: <SelectRecipients />,
	},
	{
		step: 2,
		value: 'draft',
		label: 'Draft',
		component: <DraftPage />,
	},
	{
		step: 3,
		value: 'send',
		label: 'Send',
		component: <Send />,
	},
];

const EmailAutomationSteps = () => {
	const { stepParam, handleTabChange, advanceToNextStep, returnToPreviousStep } =
		useEmailAutomationSteps();

	return (
		<>
			<Tabs
				defaultValue="1"
				value={stepParam}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="grid grid-cols-3 mx-auto bg-transparent">
					{steps.map((step) => (
						<TabsTrigger key={step.step} value={step.step.toString()}>
							{`Step ${step.step}: ${step.label}`}
						</TabsTrigger>
					))}
				</TabsList>
				{steps.map((step) => (
					<TabsContent key={step.step} value={step.step.toString()}>
						{step.component}
					</TabsContent>
				))}
			</Tabs>
			<div className="flex mx-auto justify-center gap-4 mt-4">
				<Button
					variant="outline"
					disabled={stepParam === '1'}
					onClick={returnToPreviousStep}
				>
					Previous Step
				</Button>
				<Button
					variant="outline"
					disabled={stepParam === '3'}
					onClick={advanceToNextStep}
				>
					Next Step
				</Button>
				<Button>Save Campaign</Button>
			</div>
		</>
	);
};

export default EmailAutomationSteps;
