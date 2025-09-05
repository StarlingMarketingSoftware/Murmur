import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
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
import { cn } from '@/utils';

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
		isAdmin,
		className,
		fullScreen,
	} = useContactTSVUploadDialog(props);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant={buttonVariant || 'primary-light'}
					className={cn('gradient-button gradient-button-blue', className)}
					bold
				>
					{triggerText}
				</Button>
			</DialogTrigger>
			<DialogContent
				className={cn(isAdmin && '!max-w-98/100 !max-h-98/100')}
				fullScreen={!!fullScreen}
			>
				<div className={cn('pt-8', fullScreen && 'w-full max-w-[1200px] mx-auto')}>
					<DialogDescription className="text-center mt-2">
						Download the template below and open it in your preferred spreadsheet
						software. Enter your data following the format of the file, then upload your
						file.
					</DialogDescription>
					<div
						className={cn(
							'flex flex-row gap-4 justify-center items-center',
							fullScreen && 'px-6 pt-2'
						)}
					>
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
						useAutoLayout
						allowColumnOverflow
						searchable={false}
						displayRowsPerPage={false}
						hidePagination
						variant="secondary"
						containerClassName={cn(
							fullScreen && 'max-h-[calc(100vh-180px)] min-h-[420px]',
							'mx-auto rounded-[8px] [&]:border-2 [&]:border-[#8C8C8C] [&]:!border-black-0'
						)}
						tableClassName="!justify-center"
						headerClassName="!border-0 !text-[12px] [&_tr]:!border-0"
						theadCellClassName="!border-0 !text-[12px] !border-b-0"
						rowClassName="!border-0 [&_td]:!border-0"
					/>
					<DialogFooter
						className={cn('justify-center items-center !border-0', fullScreen && 'pb-6')}
					>
						<Button onClick={handleClear} type="button" variant="light">
							Clear
						</Button>
						<Button onClick={handleSave} isLoading={isPending} type="submit">
							Save
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default ContactTSVUploadDialog;
