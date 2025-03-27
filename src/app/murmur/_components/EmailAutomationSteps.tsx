import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SelectRecipients from './emailAutomation/recipients/Recipients';
import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';
import Draft from './emailAutomation/draft/Draft';
import Send from './emailAutomation/send/Send';

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
		component: <Draft />,
	},
	{
		step: 3,
		value: 'send',
		label: 'Send',
		component: <Send />,
	},
];

const EmailAutomationSteps = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const stepParam = searchParams.get('step') ?? '1';

	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(searchParams);
		params.set('step', value);
		router.push(`${pathname}?${params.toString()}`);
	};

	const advanceToNextStep = () => {
		const params = new URLSearchParams(searchParams);
		params.set('step', (parseInt(stepParam) + 1).toString());
		router.push(`${pathname}?${params.toString()}`);
	};

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
			{stepParam !== '3' && (
				<Button className="mt-4" onClick={advanceToNextStep}>
					Next Step
				</Button>
			)}
		</>
	);
};

export default EmailAutomationSteps;
