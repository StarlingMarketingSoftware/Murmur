import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
	DialogClose,
} from '@/components/ui/dialog';

import { usePrivateContactImportDialog } from './usePrivateContactImportDialog';
import { DownloadIcon, UploadIcon, XIcon } from 'lucide-react';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import { Alert } from '@/components/ui/alert';

export const PrivateContactImportDialog = () => {
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
	} = usePrivateContactImportDialog();
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="light">Import</Button>
			</DialogTrigger>
			<DialogContent aria-description="hi" className="min-w-[1000px] !max-w-none !w-9/10">
				<DialogClose asChild={true}>
					<XIcon
						className="flex flex-row justify-self-end"
						onClick={() => setOpen(false)}
					/>
				</DialogClose>
				<DialogHeader>
					<DialogTitle>Add Contacts by TSV Upload</DialogTitle>
				</DialogHeader>
				<div className="flex flex-row gap-4">
					<input
						type="file"
						ref={fileInputRef}
						className="hidden"
						accept=".txt"
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
					{tsvData.length > 0 && (
						<Alert className="grid-cols-none w-fit h-fit" variant="warning">
							You have unsaved changes!
						</Alert>
					)}
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

export default PrivateContactImportDialog;
