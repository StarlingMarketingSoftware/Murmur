import { Button } from '@/components/ui/button';
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs';
import SelectRecipients from './_components/SelectRecipients';

const Murmur = () => {
	return (
		<div className="max-w-[900px] mx-auto">
			<Tabs defaultValue="murmur" className="w-full mt-12">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="murmur">Murmur</TabsTrigger>
					<TabsTrigger value="inbox">Inbox</TabsTrigger>
				</TabsList>
				<TabsContent value="murmur">
					<SelectRecipients />
				</TabsContent>
				<TabsContent value="inbox">
					<Card>
						<CardHeader>
							<CardTitle>Password</CardTitle>
							<CardDescription>
								Change your password here. After saving, you'll be logged out.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="space-y-1">
								<Label htmlFor="current">Current password</Label>
								<Input id="current" type="password" />
							</div>
							<div className="space-y-1">
								<Label htmlFor="new">New password</Label>
								<Input id="new" type="password" />
							</div>
						</CardContent>
						<CardFooter>
							<Button>Save password</Button>
						</CardFooter>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default Murmur;
