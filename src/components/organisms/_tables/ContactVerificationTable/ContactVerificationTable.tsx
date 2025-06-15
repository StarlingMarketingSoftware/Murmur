'use client';

import Spinner from '@/components/ui/spinner';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import { Button } from '@/components/ui/button';
import { useContactVerificationTable } from './useContactVerificationTable';
import { CheckIcon } from 'lucide-react';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const ContactVerificationTable = () => {
	const {
		contactVerificationRequests,
		isPendingContactVerificationRequests,
		isPendingVerifyContacts,
		columns,
		form,
		onSubmit,
	} = useContactVerificationTable();

	return (
		<>
			<div className="mb-4 p-4 border rounded-md">
				<h3 className="text-lg font-semibold mb-2">Start Contact Verification</h3>
				<p className="text-sm text-muted-foreground mb-4">
					Verify email addresses using ZeroBounce. You can filter by a specific email,
					limit the number of contacts to verify, and choose whether to only verify
					unverified contacts.
				</p>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
							<FormField
								control={form.control}
								name="query"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email Filter (optional)</FormLabel>
										<FormControl>
											<Input
												type="email"
												placeholder="Enter specific email to verify"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="limit"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Limit (optional)</FormLabel>
										<FormControl>
											<Input
												type="number"
												placeholder="Max contacts to verify"
												{...field}
												onChange={(e) => {
													const value = e.target.value;
													field.onChange(value === '' ? undefined : Number(value));
												}}
												value={field.value === undefined ? '' : field.value}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="onlyUnverified"
								render={({ field }) => (
									<FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-8">
										<FormControl>
											<Checkbox checked={field.value} onCheckedChange={field.onChange} />
										</FormControl>
										<div className="space-y-1 leading-none">
											<FormLabel>Only Unverified</FormLabel>
										</div>
									</FormItem>
								)}
							/>
						</div>
						<div className="flex justify-start">
							<Button type="submit" isLoading={isPendingVerifyContacts}>
								<CheckIcon />
								Verify Contacts
							</Button>
						</div>
					</form>
				</Form>
			</div>
			{isPendingContactVerificationRequests ? (
				<Spinner />
			) : (
				<CustomTable columns={columns} data={contactVerificationRequests} />
			)}
		</>
	);
};

export default ContactVerificationTable;
