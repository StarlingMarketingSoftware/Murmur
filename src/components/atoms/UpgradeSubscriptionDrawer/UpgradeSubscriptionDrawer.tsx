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
import { ConfirmModal } from '@/components/atoms/ConfirmModal';

export const UpgradeSubscriptionDrawer: FC<UpgradeSubscriptionDrawerProps> = (props) => {
	const {
		handleUpgradeSubscription,
		triggerButtonText,
		message,
		isConfirmModalOpen,
		setIsConfirmModalOpen,
	} = useUpgradeSubscriptionDrawer(props);

	return (
		<Drawer>
			<DrawerTrigger asChild>
				<Button variant="primary">{triggerButtonText}</Button>
			</DrawerTrigger>
			<DrawerContent>
				<div className="mx-auto w-full max-w-sm">
					<DrawerHeader>
						<DrawerTitle>Upgrade Your Subscription</DrawerTitle>
						<DrawerDescription>{message}</DrawerDescription>
					</DrawerHeader>
					<div className="p-4 pb-0">
						<Button onClick={handleUpgradeSubscription} className="w-full">
							Upgrade Your Subscription
						</Button>
					</div>
					<DrawerFooter />
				</div>
			</DrawerContent>
			<ConfirmModal
				isOpen={isConfirmModalOpen}
				onClose={() => setIsConfirmModalOpen(false)}
				onConfirm={handleUpgradeSubscription}
				title="Upgrade Your Subscription"
				description="Are you sure you want to upgrade your subscription?"
				confirmButtonText="Pay and Upgrade"
				cancelButtonText="Cancel"
			/>
		</Drawer>
	);
};
