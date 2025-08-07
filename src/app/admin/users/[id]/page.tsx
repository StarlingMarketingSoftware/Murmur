'use client';
import { FC } from 'react';
import Spinner from '@/components/ui/spinner';
import { useManageUserDetail } from './useManageUserDetail';
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
import { Typography } from '@/components/ui/typography';

const ManageUserDetail: FC = () => {
	const {
		user,
		isPendingUser,
		freeTrialCode,
		handleUpdateCustomDomain,
		form,
		isEditingUser,
		handleSignUpFreeSubscription,
		isPendingCreateStripeSubscription,
		hasPartnerSubscription,
	} = useManageUserDetail();
	return (
		<>
			{isPendingUser ? (
				<Spinner />
			) : (
				<>
					{/* <Card size="lg">
						<CardHeader>
							<CardTitle>{user?.firstName + ' ' + user?.lastName}</CardTitle>
						</CardHeader>
						<CardContent>
							<Button
								className="mb-2"
								onClick={handleGenerateFreeTrialCode}
								variant="primary"
							>
								Generate Free Trial Code
							</Button>
							{freeTrialCode && <Input value={freeTrialCode} readOnly />}
						</CardContent>
					</Card> */}
					<Card size="lg">
						<CardHeader>
							<CardTitle>{user?.firstName + ' ' + user?.lastName}</CardTitle>
						</CardHeader>
						<CardContent>
							<Button
								className="mb-2"
								onClick={handleSignUpFreeSubscription}
								variant="primary"
								isLoading={isPendingCreateStripeSubscription}
								disabled={hasPartnerSubscription}
							>
								{hasPartnerSubscription
									? 'Partner Subscription Active'
									: 'Assign Free Subscription'}
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
								<Typography variant="muted">
									Current Domain: {user?.customDomain || 'Not registered'}
								</Typography>
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
									<Button type="submit" className="mb-2" isLoading={isEditingUser}>
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

export default ManageUserDetail;
