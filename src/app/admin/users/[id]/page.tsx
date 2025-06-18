'use client';
import { FC } from 'react';
import Spinner from '@/components/ui/spinner';
import { useManageUserDetail } from './useManageContactListDetail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { TypographyMuted } from '@/components/ui/typography';

const ManageContactListDetail: FC = () => {
	const {
		user,
		isPendingUser,
		handleGenerateFreeTrialCode,
		freeTrialCode,
		handleUpdateCustomDomain,
		form,
		isEditingUser,
	} = useManageUserDetail();
	return (
		<>
			{isPendingUser ? (
				<Spinner />
			) : (
				<>
					<Card size="lg">
						<CardHeader>
							<CardTitle>{user?.firstName + ' ' + user?.lastName}</CardTitle>
						</CardHeader>
						<CardContent>
							<Button
								className="mb-2"
								onClick={handleGenerateFreeTrialCode}
								variant="default"
							>
								Generate Free Trial Code
							</Button>
							{freeTrialCode && <Input value={freeTrialCode} readOnly />}
						</CardContent>
					</Card>
					<Card size="lg">
						<CardHeader>
							<CardTitle>Custom Domain</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="mb-4">
								<TypographyMuted>
									Current Domain: {user?.customDomain || 'Not registered'}
								</TypographyMuted>
							</div>
							<Form {...form}>
								<form
									onSubmit={form.handleSubmit(handleUpdateCustomDomain)}
									className="space-y-4"
								>
									<FormField
										control={form.control}
										name="domain"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Update domain</FormLabel>
												<FormControl>
													<Input
														placeholder="Enter email address (e.g., user@example.com) or leave empty to clear"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<Button
										type="submit"
										className="mb-2"
										variant="default"
										isLoading={isEditingUser}
									>
										{isEditingUser ? 'Updating...' : 'Update Domain'}
									</Button>
								</form>
							</Form>
						</CardContent>
					</Card>
				</>
			)}
		</>
	);
};

export default ManageContactListDetail;
