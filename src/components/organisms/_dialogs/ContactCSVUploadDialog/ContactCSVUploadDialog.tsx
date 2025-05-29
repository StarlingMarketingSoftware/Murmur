import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from '@/components/ui/dialog';

import { useContactCSVUploadDialog } from './useContactCSVUploadDialog';
import { DownloadIcon, PlusIcon, UploadIcon } from 'lucide-react';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import { Alert } from '@/components/ui/alert';

export const ContactCSVUploadDialog = () => {
	const {
		isPending,
		open,
		setOpen,
		columns,
		csvData,
		handleTemplateDownload,
		handleFileUpload,
		handleUploadClick,
		fileInputRef,
		handleSave,
	} = useContactCSVUploadDialog();
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" className="w-fit">
					<PlusIcon />
					Batch Create with CSV
				</Button>
			</DialogTrigger>
			<DialogContent className="min-w-[1000px]">
				<DialogHeader>
					<DialogTitle>Add Contacts by CSV Upload</DialogTitle>
				</DialogHeader>
				<div className="flex flex-row gap-4">
					<input
						type="file"
						ref={fileInputRef}
						className="hidden"
						accept=".csv"
						onChange={handleFileUpload}
					/>
					<Button onClick={handleUploadClick}>
						<UploadIcon />
						Upload CSV
					</Button>
					<Button variant="outline" onClick={handleTemplateDownload}>
						<DownloadIcon />
						Download CSV Template
					</Button>
				</div>
				<CustomTable
					columns={columns}
					data={csvData}
					noDataMessage="Upload a CSV file to load data."
				/>
				<DialogFooter className="justify-between items-center">
					{csvData.length > 0 && (
						<Alert className="grid-cols-none w-fit h-fit" variant="warning">
							You have unsaved changes!
						</Alert>
					)}
					<Button onClick={handleSave} isLoading={isPending} type="submit">
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ContactCSVUploadDialog;
