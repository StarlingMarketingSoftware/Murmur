import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FC } from 'react';
import {
	EmailAutomationStepsProps,
	useEmailAutomationSteps,
} from './useEmailAutomationSteps';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import { ArrowLeft, ArrowRight, SquareChevronLeft } from 'lucide-react';

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
				<TabsList className="mx-auto">
					{steps.map((step) => (
						<TabsTrigger key={step.step} value={step.step.toString()}>
							{step.icon}
							{`${step.label}`}
						</TabsTrigger>
					))}
				</TabsList>
				{steps.map((step) => (
					<TabsContent key={step.step} value={step.step.toString()}>
						{step.component}
					</TabsContent>
				))}
			</Tabs>
			<div className="flex sm:flex-row flex-col-reverse mx-auto justify-center items-center gap-4 mt-4">
				<Link href={urls.murmur.dashboard.index}>
					<Button variant="ghost">
						<SquareChevronLeft />
						Back to Dashboard
					</Button>
				</Link>
				<div className="flex flex-row justify-center items-center gap-4">
					<Button
						variant="primary-light"
						disabled={stepParam === '1'}
						onClick={returnToPreviousStep}
					>
						<ArrowLeft />
						Previous Step
					</Button>
					<Button
						variant="primary-light"
						disabled={stepParam === '3'}
						onClick={advanceToNextStep}
					>
						Next Step <ArrowRight />
					</Button>
				</div>
			</div>
		</>
	);
};

export default EmailAutomationSteps;
