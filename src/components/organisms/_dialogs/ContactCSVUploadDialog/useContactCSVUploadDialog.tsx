import { useState, useRef } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Contact } from '@prisma/client';
import { TableDeleteRowButton } from '@/components/molecules/TableDeleteRowButton/TableDeleteRowButton';
import {
	NoDataCell,
	TableSortingButton,
} from '@/components/molecules/CustomTable/CustomTable';
import { useBatchCreateContacts } from '@/hooks/queryHooks/useContacts';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

export const useContactCSVUploadDialog = () => {
	const params = useParams<{ id: string }>();
	const contactListId = Number(params.id);
	const [open, setOpen] = useState(false);
	const [csvData, setCsvData] = useState<Contact[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { mutateAsync: createContacts, isPending } = useBatchCreateContacts();

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			const lines = text.split('\n');
			const headers = lines[0].split(',').map((header) => header.trim());

			const parsedData = lines
				.slice(1)
				.filter((line) => line.trim() !== '')
				.map((line, index) => {
					const values = line.split(',').map((value) => value.trim());
					const contact: Partial<Contact> = {
						id: index,
						lastName: values[headers.indexOf('name')] || '',
						email: values[headers.indexOf('email')] || '',
						company: values[headers.indexOf('company')] || '',
						country: values[headers.indexOf('country')] || '',
						state: values[headers.indexOf('state')] || '',
						website: values[headers.indexOf('website')] || '',
						phone: values[headers.indexOf('phone')] || '',
					};
					return contact as Contact;
				});

			setCsvData(parsedData);
		};
		reader.readAsText(file);
		event.target.value = ''; // Reset input
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleSave = async () => {
		if (!csvData || csvData.length === 0) {
			toast.error('No data to upload');
			return;
		}
		await createContacts({ contacts: csvData, contactListId });
		setCsvData([]);
		setOpen(false);
	};

	const columns: ColumnDef<Contact>[] = [
		{
			accessorKey: 'name',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Name" />;
			},
			cell: ({ row }) => {
				const name: string = row.getValue('name');
				if (!name) return <NoDataCell />;

				return <div className="text-left">{row.getValue('name')}</div>;
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
						setCsvData((prev) => prev.filter((_, index) => index !== row.index));
					}}
				/>
			),
		},
	];

	const handleTemplateDownload = () => {
		const link = document.createElement('a');
		link.href = '/sampleContactListCSV.csv';
		link.download = 'contact-template.csv';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return {
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
	};
};
