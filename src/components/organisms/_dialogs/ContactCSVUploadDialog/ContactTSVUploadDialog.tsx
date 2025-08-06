import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from '@/components/ui/dialog';

import {
	ContactTSVUploadDialogProps,
	useContactTSVUploadDialog,
} from './useContactTSVUploadDialog';
import { DownloadIcon, UploadIcon } from 'lucide-react';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import { FC } from 'react';
import { DialogDescription } from '@radix-ui/react-dialog';
import { twMerge } from 'tailwind-merge';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';

export const ContactTSVUploadDialog: FC<ContactTSVUploadDialogProps> = (props) => {
	const {
		isPending,
		isOpen,
		setOpen,
		columns,
		tsvData,
		handleTemplateDownload,
		handleFileUpload,
		handleUploadClick,
		fileInputRef,
		handleSave,
		handleClear,
		triggerText,
		buttonVariant,
		isAdmin,
		isOpenDrawer,
		setIsOpenDrawer,
		verificationCredits,
		lastParsedDataLength,
	} = useContactTSVUploadDialog(props);

	return (
		<Dialog open={isOpen} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant={buttonVariant || 'primary-light'} className="w-fit" bold>
					{triggerText}
				</Button>
			</DialogTrigger>
			<DialogContent
				className={twMerge(isAdmin ? '!max-w-98/100 !max-h-98/100' : '!max-w-70/100')}
			>
				<DialogHeader>
					<DialogTitle>Add Contacts by Excel Upload</DialogTitle>
				</DialogHeader>
				<DialogDescription>
					Download the Excel file template below and open it in your preferred spreadsheet
					software. Enter your data following the same format, save, then upload your
					file. Email addresses are required. Please provide as many details as possible
					to ensure high quality, personalized emails. You can upload 100 contacts at a
					time.
				</DialogDescription>
				<div className="flex flex-row gap-4">
					<input
						type="file"
						ref={fileInputRef}
						className="hidden"
						accept=".xlsx,.xls"
						onChange={handleFileUpload}
					/>
					<Button onClick={handleUploadClick}>
						<UploadIcon />
						Upload Excel
					</Button>
					<Button variant="light" onClick={handleTemplateDownload}>
						<DownloadIcon />
						Download Template
					</Button>
				</div>
				<CustomTable
					columns={columns}
					data={tsvData}
					noDataMessage="Upload an Excel file to load data."
					constrainHeight
					displayRowsPerPage={false}
					rowsPerPage={1000}
				/>
				<DialogFooter className="justify-center items-center">
					<Button onClick={handleClear} type="button" variant="light">
						Clear
					</Button>
					<Button onClick={handleSave} isLoading={isPending} type="submit">
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
			<UpgradeSubscriptionDrawer
				message={`You have attempted to upload ${lastParsedDataLength} contacts, however you only have ${verificationCredits} import credit(s) remaining. Please upgrade your plan or remove some contacts from the file.`}
				hideTriggerButton
				isOpen={isOpenDrawer}
				setIsOpen={setIsOpenDrawer}
			/>
		</Dialog>
	);
};

export default ContactTSVUploadDialog;
