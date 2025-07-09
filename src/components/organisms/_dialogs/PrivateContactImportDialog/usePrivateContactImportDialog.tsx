import { useState, useRef } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Contact } from '@prisma/client';
import { TableDeleteRowButton } from '@/components/molecules/TableDeleteRowButton/TableDeleteRowButton';
import {
	NoDataCell,
	TableSortingButton,
} from '@/components/molecules/CustomTable/CustomTable';
import { usePrivateBatchCreateContacts } from '@/hooks/queryHooks/useContacts';
import { toast } from 'sonner';
import Papa from 'papaparse';

export const usePrivateContactImportDialog = () => {
	const columns: ColumnDef<Contact>[] = [
		{
			accessorKey: 'firstName',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="First Name" />;
			},
			cell: ({ row }) => {
				const name: string = row.getValue('firstName');
				if (!name) return <NoDataCell />;

				return <div className="text-left">{row.getValue('firstName')}</div>;
			},
		},
		{
			accessorKey: 'lastName',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Last Name" />;
			},
			cell: ({ row }) => {
				const name: string = row.getValue('lastName');
				if (!name) return <NoDataCell />;

				return <div className="text-left">{row.getValue('lastName')}</div>;
			},
		},
		{
			accessorKey: 'email',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Email" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('email')}</div>;
			},
		},
		{
			accessorKey: 'company',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('company')}</div>;
			},
		},
		{
			accessorKey: 'address',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Address" />;
			},
			cell: ({ row }) => {
				return <div className="text-left">{row.getValue('address')}</div>;
			},
		},
		{
			accessorKey: 'country',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Country" />;
			},
			cell: ({ row }) => {
				const country: string = row.getValue('country');
				if (!country) return <NoDataCell />;

				return <div className="text-left">{row.getValue('country')}</div>;
			},
		},
		{
			accessorKey: 'state',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="State" />;
			},
			cell: ({ row }) => {
				const state: string = row.getValue('state');
				if (!state) return <NoDataCell />;

				return <div className="text-left">{row.getValue('state')}</div>;
			},
		},
		{
			accessorKey: 'phone',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Phone" />;
			},
			cell: ({ row }) => {
				const phone: string = row.getValue('phone');
				if (!phone) return <NoDataCell />;

				return <div className="text-left">{row.getValue('phone')}</div>;
			},
		},
		{
			accessorKey: 'website',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Website" />;
			},
			cell: ({ row }) => {
				const website: string = row.getValue('website');
				if (!website) return <NoDataCell />;

				return <div className="text-left">{row.getValue('website')}</div>;
			},
		},
		{
			id: 'action',
			cell: ({ row }) => (
				<TableDeleteRowButton
					onClick={() => {
						setTsvData((prev) => prev.filter((_, index) => index !== row.index));
					}}
				/>
			),
		},
	];

	const [open, setOpen] = useState(false);
	console.log('🚀 ~ usePrivateContactImportDialog ~ open:', open);
	const [tsvData, setTsvData] = useState<Contact[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { mutateAsync: createContacts, isPending } = usePrivateBatchCreateContacts();
	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		Papa.parse(file, {
			header: true,
			delimiter: '\t',
			skipEmptyLines: true,
			transformHeader: (header: string) => header.trim().toLowerCase(),
			transform: (value: string) => value.trim(),
			complete: (results) => {
				if (results.errors.length > 0) {
					console.error('TSV parsing errors:', results.errors);
					toast.error('Error parsing TSV file. Please check the format.');
					return;
				}

				const parsedData = (results.data as Record<string, string>[])
					.filter((row) => Object.values(row).some((value) => value !== ''))
					.map((row) => {
						const contact: Partial<Contact> = {
							firstName: row.firstname || '',
							lastName: row.lastname || '',
							company: row.company || '',
							email: row.email || '',
							address: row.address,
							country: row.country || '',
							state: row.state || '',
							website: row.website || '',
							phone: row.phone || '',
						};
						return contact as Contact;
					});

				setTsvData(parsedData);
				toast.success(`Successfully parsed ${parsedData.length} contacts`);
			},
			error: (error) => {
				console.error('TSV parsing failed:', error);
				toast.error('Failed to parse TSV file');
			},
		});

		event.target.value = ''; // Reset input
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleSave = async () => {
		if (!tsvData || tsvData.length === 0) {
			toast.error('No data to upload');
			return;
		}
		await createContacts({ contacts: tsvData });
		setTsvData([]);
		setOpen(false);
	};

	const handleTemplateDownload = () => {
		const link = document.createElement('a');
		link.href = '/sampleContactListTSV.txt';
		link.download = 'sampleContactListTSV.txt';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleClear = () => {
		setTsvData([]);
	};

	return {
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
	};
};
