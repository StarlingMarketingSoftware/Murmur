import { Button } from '@/components/ui/button';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer';
import {
	UpgradeSubscriptionDrawerProps,
	useUpgradeSubscriptionDrawer,
} from './useUpgradeSubscriptionDrawer';
import { FC } from 'react';
import { ConfirmDialog } from '@/components/organisms/_dialogs/ConfirmDialog/ConfirmDialog';
import { Typography } from '@/components/ui/typography';

export const UpgradeSubscriptionDrawer: FC<UpgradeSubscriptionDrawerProps> = (props) => {
	const {
		handleConfirmUpgradeSubscription,
		triggerButtonText,
		message,
		isConfirmModalOpen,
		setIsConfirmModalOpen,
		subscriptionTier,
		formattedPrice,
		handleUpgradeFreeTrialSubscription,
		isOpen,
		setIsOpen,
		isSubscriptionActive,
		isUpgrading,
	} = useUpgradeSubscriptionDrawer(props);

	return (
		<Drawer open={isOpen} onOpenChange={setIsOpen}>
			<DrawerTrigger asChild>
				<Button variant="primary">{triggerButtonText}</Button>
			</DrawerTrigger>
			<DrawerContent>
				{isSubscriptionActive ? (
					<div className="mx-auto w-full max-w-sm">
						<DrawerHeader>
							<DrawerTitle>Upgrade Successful!</DrawerTitle>
							<DrawerDescription>
								Your plan has been successfully upgraded. Enjoy your new benefits.
							</DrawerDescription>
						</DrawerHeader>
						<div className="p-4 pb-0">
							<Button onClick={() => setIsOpen(false)} className="w-full">
								Get Back to Emailing
							</Button>
						</div>
						<DrawerFooter />
					</div>
				) : (
					<div className="mx-auto w-full max-w-sm">
						<DrawerHeader>
							<DrawerTitle>Upgrade Your Subscription</DrawerTitle>
							<DrawerDescription>{message}</DrawerDescription>
						</DrawerHeader>
						<div className="p-4 pb-0">
							<Button
								onClick={handleConfirmUpgradeSubscription}
								isLoading={isUpgrading}
								className="w-full"
							>
								Upgrade Your Subscription
							</Button>
						</div>
						<DrawerFooter />
					</div>
				)}
			</DrawerContent>
			<ConfirmDialog
				open={isConfirmModalOpen}
				onOpenChange={setIsConfirmModalOpen}
				onClose={() => setIsConfirmModalOpen(false)}
				confirmAction={handleUpgradeFreeTrialSubscription}
				title="Confirm Subscription Upgrade"
				confirmButtonText={`Pay ${formattedPrice} and Upgrade`}
				hideCancelButton
			>
				<Typography variant="p">
					You are currently on a free trial of the{' '}
					<strong>{subscriptionTier?.name}</strong> plan.
				</Typography>
				<Typography variant="p">
					By clicking the button below, we will immediately upgrade you to the paid
					version of the <strong>{subscriptionTier?.name}</strong> plan at a rate of{' '}
					<strong>{formattedPrice}/month</strong>, and the card you have on file will be
					charged.
				</Typography>
			</ConfirmDialog>
		</Drawer>
	);
};
