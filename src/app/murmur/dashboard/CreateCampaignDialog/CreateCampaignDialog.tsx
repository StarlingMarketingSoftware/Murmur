import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { useCreateCampaignDialog } from './useCreateCampaignDialog';

export const CreateCampaignDialog = () => {
	const { form, onSubmit, isPending, open, setOpen } = useCreateCampaignDialog();
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button className="w-fit mx-auto" variant="outline">
					Create New Campaign
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Create a Campaign</DialogTitle>
					<DialogDescription></DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button isLoading={isPending} type="submit">
								Create
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};

export default CreateCampaignDialog;
