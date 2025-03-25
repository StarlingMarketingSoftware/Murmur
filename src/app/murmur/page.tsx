'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmailAutomationSteps from './_components/EmailAutomationSteps';
import Inbox from './_components/Inbox';

const Murmur = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const tab = searchParams.get('tab') ?? 'murmur';

	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(searchParams);
		params.set('tab', value);
		router.push(`/murmur?${params.toString()}`);
	};

	return (
		<div className="max-w-[900px] mx-auto">
			<Tabs
				defaultValue="murmur"
				value={tab}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="grid grid-cols-2 mx-auto">
					<TabsTrigger value="murmur">Murmur</TabsTrigger>
					<TabsTrigger value="inbox">Inbox</TabsTrigger>
				</TabsList>
				<TabsContent value="murmur">
					<EmailAutomationSteps />
				</TabsContent>
				<TabsContent value="inbox">
					<Card>
						<Inbox />
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default Murmur;
