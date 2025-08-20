import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	ManageCampaignContactListDialogProps,
	useManageCampaignContactListDialog,
} from './useManageCampaignContactListDialog';
import { FC, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Typography } from '@/components/ui/typography';
import { PlusIcon, EditIcon, X, SquareCheckIcon } from 'lucide-react';
import Spinner from '@/components/atoms/Spinner/Spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import EditContactListDialog from '../EditContactListDialog/EditContactListDialog';
import { UserContactList } from '@prisma/client';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface ContactListItemProps {
	contactList: UserContactList;
	children: ReactNode;
	showCheckIcon?: boolean;
}

const ContactListItem: FC<ContactListItemProps> = ({
	contactList,
	children,
	showCheckIcon = false,
}) => {
	return (
		<div className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
			<div className="flex items-center gap-2">
				{showCheckIcon && <SquareCheckIcon className="h-4 w-4 text-primary" />}
				<div className="text-sm">{contactList.name}</div>
			</div>
			<div className="flex gap-1">{children}</div>
		</div>
	);
};

export const ManageCampaignContactListDialog: FC<ManageCampaignContactListDialogProps> = (
	props
) => {
	const {
		searchQuery,
		setSearchQuery,
		availableContactLists,
		campaignContactLists,
		isPendingUserContactLists,
		isPendingEditCampaign,
		handleAddContactList,
		handleRemoveContactList,
		handleEditContactList,
		isEditDialogOpen,
		setIsEditDialogOpen,
		selectedEditContactList,
		open,
		onOpenChange,
	} = useManageCampaignContactListDialog(props);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogTrigger asChild>
					<Button variant="action-link">Change</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px]">
					<DialogHeader>
						<DialogTitle>Manage Contact Lists</DialogTitle>
						<DialogDescription>
							Select which contact lists to include in this campaign for email drafting.
						</DialogDescription>
					</DialogHeader>

					{/* Mobile View - Dropdown */}
					<div className="grid grid-cols-1 gap-4 md:hidden w-full">
						{isPendingUserContactLists ? (
							<Spinner />
						) : (
							<>
								<Select
									onValueChange={(contactListId) => {
										const contactList = availableContactLists.find(
											(cl: UserContactList) => cl.id.toString() === contactListId
										);
										if (contactList) {
											handleAddContactList(contactList);
										}
									}}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Add contact list to campaign" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectLabel>Available Contact Lists</SelectLabel>
											{availableContactLists.map((contactList: UserContactList) => (
												<SelectItem
													key={contactList.id}
													value={contactList.id.toString()}
												>
													{contactList.name}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>

								<ScrollArea className="h-48 w-full rounded-md border">
									<div className="p-4">
										<Typography variant="h4" className="mb-2">
											Selected Contact Lists
										</Typography>
										{campaignContactLists.length === 0 ? (
											<Typography color="light" className="text-center py-4">
												No contact lists selected for this campaign
											</Typography>
										) : (
											campaignContactLists.map((contactList) => (
												<div key={contactList.id}>
													<ContactListItem contactList={contactList} showCheckIcon>
														<Button
															size="sm"
															variant="ghost"
															onClick={() => handleEditContactList(contactList)}
														>
															<EditIcon className="h-3 w-3 " />
														</Button>
														<Button
															size="sm"
															variant="ghost"
															onClick={() => handleRemoveContactList(contactList)}
															disabled={isPendingEditCampaign}
															className="h-6 w-6 p-0 text-destructive"
														>
															<X className="h-3 w-3" />
														</Button>
													</ContactListItem>
												</div>
											))
										)}
									</div>
								</ScrollArea>
							</>
						)}
					</div>

					{/* Desktop View - Two Column Layout */}
					<div className="hidden md:flex flex-row gap-4">
						{/* Left Column - Available Contact Lists */}
						<div className="w-6/12">
							<Typography variant="h4" bold className="mb-2">
								Available Contact Lists
							</Typography>

							{/* Search Bar */}
							<div className="relative mb-4">
								<Input
									placeholder="Search..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-3"
								/>
							</div>

							{isPendingUserContactLists ? (
								<Spinner />
							) : (
								<ScrollArea className="h-72 w-full mb-4 rounded-md border">
									<div className="p-4">
										{availableContactLists.length === 0 ? (
											<Typography color="light" className="text-center py-8">
												{searchQuery
													? 'No contact lists match your search'
													: 'All contact lists are already added to this campaign'}
											</Typography>
										) : (
											availableContactLists.map((contactList: UserContactList) => (
												<div key={contactList.id}>
													<ContactListItem contactList={contactList}>
														<Button
															size="sm"
															variant="ghost"
															onClick={() => handleAddContactList(contactList)}
															disabled={isPendingEditCampaign}
															className="h-8 w-8 p-0"
														>
															<PlusIcon className="h-4 w-4 text-secondary" />
														</Button>
													</ContactListItem>
													<Separator className="my-2" />
												</div>
											))
										)}
									</div>
								</ScrollArea>
							)}
						</div>

						<Separator orientation="vertical" className="h-[300px]" />

						{/* Right Column - Campaign Contact Lists */}
						<div className="w-6/12">
							<Typography variant="h4" bold className="mb-2">
								Campaign Contact Lists
							</Typography>

							<ScrollArea className="h-[352px] w-full mb-4 rounded-md border">
								<div className="p-4">
									{campaignContactLists.length === 0 ? (
										<Typography color="light" className="text-center py-8">
											No contact lists selected for this campaign
										</Typography>
									) : (
										campaignContactLists.map((contactList) => (
											<div key={contactList.id}>
												<ContactListItem contactList={contactList} showCheckIcon>
													<Button
														size="sm"
														variant="ghost"
														onClick={() => handleEditContactList(contactList)}
														className="h-8 w-8 p-0"
													>
														<EditIcon className="h-4 w-4 text-secondary" />
													</Button>
													<Button
														size="sm"
														variant="ghost"
														onClick={() => handleRemoveContactList(contactList)}
														disabled={isPendingEditCampaign}
														className="h-8 w-8 p-0 text-destructive"
													>
														<X className="h-4 w-4" />
													</Button>
												</ContactListItem>
												<Separator className="my-2" />
											</div>
										))
									)}
								</div>
							</ScrollArea>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit Contact List Dialog */}
			<EditContactListDialog
				isOpen={isEditDialogOpen}
				setIsOpen={setIsEditDialogOpen}
				selectedContactList={selectedEditContactList}
			/>
		</>
	);
};
