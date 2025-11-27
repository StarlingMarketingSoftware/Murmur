import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogTrigger,
	DialogFooter,
	DialogDescription,
} from '@/components/ui/dialog';

import {
	ContactTSVUploadDialogProps,
	useContactTSVUploadDialog,
} from './useContactTSVUploadDialog';
import CustomTable from '@/components/molecules/CustomTable/CustomTable';
import { FC } from 'react';
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
				{props.asTextTrigger ? (
					<span
						className={cn('cursor-pointer select-none', className)}
						style={{
							fontFamily:
								'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
							fontSize: '12px',
							fontWeight: 600,
							color: 'rgba(0, 0, 0, 0.43)',
						}}
					>
						{triggerText}
					</span>
				) : (
					<Button
						variant={buttonVariant || 'primary-light'}
						className={cn('gradient-button gradient-button-blue', className)}
						bold
					>
						{triggerText}
					</Button>
				)}
			</DialogTrigger>
			<DialogContent
				className={cn(isAdmin && '!max-w-98/100 !max-h-98/100')}
				fullScreen={!!fullScreen}
			>
				<div className={cn('pt-8', fullScreen && 'w-full max-w-[1200px] mx-auto')}>
					<DialogDescription className="text-center mt-2 invisible" aria-hidden>
						Download the template below and open it in your preferred spreadsheet
						software. Enter your data following the format of the file, then upload your
						file.
					</DialogDescription>
					<div
						className={cn(
							'mx-auto rounded-[8px] border-2 border-[#8C8C8C] flex flex-col relative overflow-hidden',
							fullScreen && 'max-h-[calc(100vh-180px)] min-h-[420px]'
						)}
					>
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
							containerClassName={cn('flex-1 min-h-0 pb-[64px] !border-0 !rounded-none')}
							tableClassName="!justify-center"
							headerClassName="!border-0 !text-[12px] [&_tr]:!border-0"
							theadCellClassName="!border-0 !text-[12px] !border-b-0"
							rowClassName="!border-0 [&_td]:!border-0"
						/>
						<div className="absolute bottom-0 left-0 right-0 bg-white px-6 py-3 flex items-center justify-end gap-4">
							<input
								type="file"
								ref={fileInputRef}
								className="hidden"
								accept=".tsv"
								onChange={handleFileUpload}
							/>
							<Button
								variant="primary-light"
								onClick={handleTemplateDownload}
								style={{ fontFamily: 'Times New Roman', fontWeight: 700 }}
								className="!bg-white !text-black !border !border-[#000000] !rounded-[8px]"
							>
								Download TSV Template
							</Button>
							<Button
								onClick={handleUploadClick}
								style={{ fontFamily: 'Times New Roman', fontWeight: 700 }}
								className="!bg-[#5DAB68] !text-white !w-[174px] !h-[39px]"
							>
								Upload TSV
							</Button>
							<Button
								onClick={handleClear}
								type="button"
								variant="light"
								style={{ fontFamily: 'Times New Roman', fontWeight: 700 }}
								className="!bg-white !text-black !border !border-[#000000] !rounded-[8px] !w-[174px] !h-[39px]"
							>
								Clear
							</Button>
						</div>
					</div>
					<DialogFooter
						className={cn('justify-center items-center !border-0', fullScreen && 'pb-6')}
					>
						<Button
							onClick={handleSave}
							isLoading={isPending}
							type="submit"
							style={{ fontFamily: 'Times New Roman', fontWeight: 700 }}
							className="!bg-white !text-black !border !border-[#5DAB68] !w-full"
						>
							Save
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default ContactTSVUploadDialog;
