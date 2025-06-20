import { FC } from 'react';

import { IdentityDialogProps, useIdentityDialog } from './useIdentityDialog';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { CreateIdentityPanel } from './CreateIdentityPanel/CreateIdentityPanel';
import { twMerge } from 'tailwind-merge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const IdentityDialog: FC<IdentityDialogProps> = (props) => {
	const {
		title,
		open,
		onOpenChange,
		text,
		children,
		triggerButton,
		showCreatePanel,
		setShowCreatePanel,
	} = useIdentityDialog(props);

	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				// if (!open) {
				// 	form.reset({
				// 		name: '',
				// 		email: '',
				// 		website: '',
				// 		verificationCode: '',
				// 	});
				// }
				onOpenChange(open);
			}}
		>
			<DialogTrigger asChild>{triggerButton}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<div className="flex flex-row items-center justify-left">
						<Button
							className="!w-fit"
							onClick={() => setShowCreatePanel((prev) => !prev)}
							variant="ghost"
						>
							<ArrowLeft />
						</Button>
						<DialogTitle>{title}</DialogTitle>
					</div>
				</DialogHeader>
				<DialogDescription className="text-sm text-muted-foreground">
					{text ? text : children}
				</DialogDescription>
				<div className="relative overflow-hidden">
					<div
						className={twMerge(
							'flex transition-transform duration-300 ease-in-out w-[200%]',
							showCreatePanel ? '-translate-x-[50.3%]' : 'translate-x-0'
						)}
					>
						<div className="w-1/2 flex-shrink-0 p-4">
							<CreateIdentityPanel />
						</div>
						<div className="w-1/2 flex-shrink-0 p-4">
							<CreateIdentityPanel />
						</div>
					</div>
				</div>
			</DialogContent>
			<DialogFooter></DialogFooter>
		</Dialog>
	);
};
