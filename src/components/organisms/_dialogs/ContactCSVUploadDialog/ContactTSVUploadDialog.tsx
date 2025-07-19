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

export const ContactTSVUploadDialog: FC<ContactTSVUploadDialogProps> = (props) => {
	const {
		isPending,
		open,
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
	} = useContactTSVUploadDialog(props);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant={buttonVariant || 'primary-light'} className="w-fit">
					{triggerText}
				</Button>
			</DialogTrigger>
			<DialogContent className="">
				<DialogHeader>
					<DialogTitle>Add Contacts by TSV Upload</DialogTitle>
				</DialogHeader>
				<DialogDescription>
					Download the template below and open it in your preferred spreadsheet software.
					Enter your data following the format of the file, then upload your file.
				</DialogDescription>
				<div className="flex flex-row gap-4">
					<input
						type="file"
						ref={fileInputRef}
						className="hidden"
						accept=".tsv"
						onChange={handleFileUpload}
					/>
					<Button onClick={handleUploadClick}>
						<UploadIcon />
						Upload TSV
					</Button>
					<Button variant="primary-light" onClick={handleTemplateDownload}>
						<DownloadIcon />
						Download TSV Template
					</Button>
				</div>
				<CustomTable
					columns={columns}
					data={tsvData}
					noDataMessage="Upload a TSV file to load data."
				/>
				<DialogFooter className="justify-between items-center">
					<Button onClick={handleClear} type="button" variant="light">
						Clear
					</Button>
					<Button onClick={handleSave} isLoading={isPending} type="submit">
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ContactTSVUploadDialog;
