import { useState, useRef } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Contact } from '@prisma/client';
import { TableDeleteRowButton } from '@/components/molecules/TableDeleteRowButton/TableDeleteRowButton';
import {
	NoDataCell,
	TableSortingButton,
} from '@/components/molecules/CustomTable/CustomTable';
import { useBatchCreateContacts } from '@/hooks/queryHooks/useContacts';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { ButtonVariants } from '@/components/ui/button';
import { useCreateUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { PostBatchContactData } from '@/app/api/contacts/batch/route';
import { useMe } from '@/hooks/useMe';
import { EllipsesWithTooltip } from '@/components/atoms/EllipsesWithTooltip/EllipsesWithTooltip';

export interface ContactTSVUploadDialogProps {
	isAdmin: boolean;
	triggerText: string;
	buttonVariant?: ButtonVariants['variant'];
	className?: string;
}

type ContactInput = PostBatchContactData['contacts'][number];

const TSVTableTooltip = ({ text }: { text: string }) => {
	return (
		<div className="text-left">
			<EllipsesWithTooltip tooltipPlacement="right" text={text} maxLength={40} />
		</div>
	);
};

export const useContactTSVUploadDialog = (props: ContactTSVUploadDialogProps) => {
	const publicColumns: ColumnDef<ContactInput>[] = [
		{
			accessorKey: 'firstName',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="First Name" />;
			},
			cell: ({ row }) => {
				const name: string = row.getValue('firstName');
				if (!name) return <NoDataCell />;
				return <TSVTableTooltip text={name} />;
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
				return <TSVTableTooltip text={name} />;
			},
		},
		{
			accessorKey: 'email',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Email" />;
			},
			cell: ({ row }) => {
				const email: string = row.getValue('email');
				if (!email) return <NoDataCell />;
				return <TSVTableTooltip text={email} />;
			},
		},
		{
			accessorKey: 'company',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company" />;
			},
			cell: ({ row }) => {
				const company: string = row.getValue('company');
				if (!company) return <NoDataCell />;
				return <TSVTableTooltip text={company} />;
			},
		},
		{
			accessorKey: 'title',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Title" />;
			},
			cell: ({ row }) => {
				const title: string = row.getValue('title');
				if (!title) return <NoDataCell />;
				return <TSVTableTooltip text={title} />;
			},
		},
		{
			accessorKey: 'headline',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Headline" />;
			},
			cell: ({ row }) => {
				const headline: string = row.getValue('headline');
				if (!headline) return <NoDataCell />;
				return <TSVTableTooltip text={headline} />;
			},
		},
		{
			accessorKey: 'address',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Address" />;
			},
			cell: ({ row }) => {
				const address: string = row.getValue('address');
				if (!address) return <NoDataCell />;
				return <TSVTableTooltip text={address} />;
			},
		},
		{
			accessorKey: 'city',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="City" />;
			},
			cell: ({ row }) => {
				const city: string = row.getValue('city');
				if (!city) return <NoDataCell />;
				return <TSVTableTooltip text={city} />;
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
				return <TSVTableTooltip text={state} />;
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
				return <TSVTableTooltip text={country} />;
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
				return <TSVTableTooltip text={phone} />;
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
				return <TSVTableTooltip text={website} />;
			},
		},
		{
			accessorKey: 'linkedInUrl',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="LinkedIn URL" />;
			},
			cell: ({ row }) => {
				const linkedInUrl: string = row.getValue('linkedInUrl');
				if (!linkedInUrl) return <NoDataCell />;
				return <TSVTableTooltip text={linkedInUrl} />;
			},
		},
		{
			accessorKey: 'photoUrl',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Photo URL" />;
			},
			cell: ({ row }) => {
				const photoUrl: string = row.getValue('photoUrl');
				if (!photoUrl) return <NoDataCell />;
				return <TSVTableTooltip text={photoUrl} />;
			},
		},
		{
			accessorKey: 'metadata',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Metadata" />;
			},
			cell: ({ row }) => {
				const metadata: string = row.getValue('metadata');
				if (!metadata) return <NoDataCell />;
				return <TSVTableTooltip text={metadata} />;
			},
		},
	];

	const adminColumns: ColumnDef<ContactInput>[] = [
		{
			accessorKey: 'companyLinkedInUrl',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company LinkedIn URL" />;
			},
			cell: ({ row }) => {
				const companyLinkedInUrl: string = row.getValue('companyLinkedInUrl');
				if (!companyLinkedInUrl) return <NoDataCell />;
				return <TSVTableTooltip text={companyLinkedInUrl} />;
			},
		},
		{
			accessorKey: 'companyFoundedYear',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company Founded Year" />;
			},
			cell: ({ row }) => {
				const companyFoundedYear: string = row.getValue('companyFoundedYear');
				if (!companyFoundedYear) return <NoDataCell />;
				return <div className="text-left">{companyFoundedYear}</div>;
			},
		},
		{
			accessorKey: 'companyType',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company Type" />;
			},
			cell: ({ row }) => {
				const companyType: string = row.getValue('companyType');
				if (!companyType) return <NoDataCell />;
				return <div className="text-left">{companyType}</div>;
			},
		},
		{
			accessorKey: 'companyTechStack',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company Tech Stack" />;
			},
			cell: ({ row }) => {
				const companyTechStack: string[] = row.getValue('companyTechStack');
				if (!companyTechStack || companyTechStack.length === 0) return <NoDataCell />;
				return <TSVTableTooltip text={companyTechStack.join(', ')} />;
			},
		},
		{
			accessorKey: 'companyPostalCode',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company Postal Code" />;
			},
			cell: ({ row }) => {
				const companyPostalCode: string = row.getValue('companyPostalCode');
				if (!companyPostalCode) return <NoDataCell />;
				return <div className="text-left">{companyPostalCode}</div>;
			},
		},
		{
			accessorKey: 'companyKeywords',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company Keywords" />;
			},
			cell: ({ row }) => {
				const companyKeywords: string[] = row.getValue('companyKeywords');
				if (!companyKeywords || companyKeywords.length === 0) return <NoDataCell />;
				return <TSVTableTooltip text={companyKeywords.join(', ')} />;
			},
		},
		{
			accessorKey: 'companyIndustry',
			header: ({ column }) => {
				return <TableSortingButton column={column} label="Company Industry" />;
			},
			cell: ({ row }) => {
				const companyIndustry: string = row.getValue('companyIndustry');
				if (!companyIndustry) return <NoDataCell />;
				return <div className="text-left">{companyIndustry}</div>;
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

	const columns: ColumnDef<ContactInput>[] = publicColumns;

	const { isAdmin, triggerText, buttonVariant, className } = props;

	if (isAdmin) {
		columns.push(...adminColumns);
	}

	const [open, setOpen] = useState(false);
	const [tsvData, setTsvData] = useState<ContactInput[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { user } = useMe();

	/* API */
	const { mutateAsync: batchCreateContacts, isPending: isPendingBatchCreateContacts } =
		useBatchCreateContacts();

	const { mutateAsync: createContactList, isPending: isPendingCreateContactList } =
		useCreateUserContactList({
			suppressToasts: true,
		});

	const trimKeywords = (keywords: string[]): string[] => {
		return keywords.map((keyword) => keyword.trim());
	};

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
					.filter((row) => row.email !== undefined && row.email !== '')
					.map((row) => ({
						firstName: row.firstname || undefined,
						lastName: row.lastname || undefined,
						company: row.company || undefined,
						email: row.email,
						address: row.address || undefined,
						city: row.city || undefined,
						country: row.country || undefined,
						state: row.state || undefined,
						website: row.website || undefined,
						phone: row.phone || undefined,
						title: row.title || undefined,
						headline: row.headline || undefined,
						linkedInUrl: row.linkedinurl || undefined,
						photoUrl: row.photourl || undefined,
						metadata: row.metadata || undefined,
						companyLinkedInUrl: row.companylinkedinurl || undefined,
						companyFoundedYear: row.companyfoundedyear || undefined,
						companyType: row.companytype || undefined,
						companyTechStack: trimKeywords(row.companytechstack?.split(',') || []),
						companyPostalCode: row.companypostalcode || undefined,
						companyKeywords: trimKeywords(row.companykeywords?.split(',') || []),
						companyIndustry: row.companyindustry || undefined,
					}));

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
		const verificationCredits = user?.verificationCredits;

		// only check verification if not isAdmin
		if (!isAdmin && tsvData.length > (verificationCredits || 0)) {
			toast.error(
				`You do not have enough upload credits to create this many contacts. Please upgrade your plan. Credits: ${verificationCredits} Number of contacts: ${tsvData.length}`
			);
			return;
		}

		const { contacts, created } = await batchCreateContacts({
			isPrivate: !isAdmin,
			contacts: tsvData,
		});

		if (created > 0) {
			await createContactList({
				name: `TSV Upload - ${new Date().toLocaleDateString()}`,
				contactIds: contacts?.map((contact: Contact) => contact.id) || [],
			});
		}
		setTsvData([]);
		setOpen(false);
	};

	const handleTemplateDownload = () => {
		const link = document.createElement('a');
		link.href = '/sampleContactListTSV.tsv';
		link.download = 'sampleContactListTSV.tsv';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleClear = () => {
		setTsvData([]);
	};

	const isPending = isPendingCreateContactList || isPendingBatchCreateContacts;

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
		triggerText,
		buttonVariant,
		isAdmin,
		className,
	};
};
