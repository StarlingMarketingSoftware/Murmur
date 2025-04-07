import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FC } from 'react';
import {
	EmailAutomationStepsProps,
	useEmailAutomationSteps,
} from './useEmailAutomationSteps';

const EmailAutomationSteps: FC<EmailAutomationStepsProps> = (props) => {
	const { stepParam, handleTabChange, advanceToNextStep, returnToPreviousStep, steps } =
		useEmailAutomationSteps(props);

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
			</div>
		</>
	);
};

export default EmailAutomationSteps;
