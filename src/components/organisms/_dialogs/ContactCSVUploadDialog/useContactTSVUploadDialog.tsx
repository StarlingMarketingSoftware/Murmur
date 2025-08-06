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
import * as XLSX from 'xlsx';
import { ButtonVariants } from '@/components/ui/button';
import { useCreateUserContactList } from '@/hooks/queryHooks/useUserContactLists';
import { PostBatchContactData } from '@/app/api/contacts/batch/route';
import { useMe } from '@/hooks/useMe';
import { EllipsesWithTooltip } from '@/components/atoms/EllipsesWithTooltip/EllipsesWithTooltip';
import { useCreateCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';

export interface ContactTSVUploadDialogProps {
	isAdmin: boolean;
	triggerText: string;
	buttonVariant?: ButtonVariants['variant'];
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
				return <div className="text-left">{city}</div>;
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
				return <div className="text-left">{state}</div>;
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
				return <div className="text-left">{country}</div>;
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
				return <div className="text-left">{phone}</div>;
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

	const { isAdmin, triggerText, buttonVariant } = props;

	if (isAdmin) {
		columns.push(...adminColumns);
	}

	/* HOOKS */
	const router = useRouter();
	const [isOpen, setOpen] = useState(false);
	const [isOpenDrawer, setIsOpenDrawer] = useState(false);
	const [tsvData, setTsvData] = useState<ContactInput[]>([]);
	const [lastParsedDataLength, setLastParsedDataLength] = useState(0);
	const [uploadProgressState, setUploadProgressState] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { user } = useMe();

	/* API */
	const { mutateAsync: batchCreateContacts, isPending: isPendingBatchCreateContacts } =
		useBatchCreateContacts();

	const { mutateAsync: createContactList, isPending: isPendingCreateContactList } =
		useCreateUserContactList({
			suppressToasts: true,
		});

	const { mutateAsync: createCampaign, isPending: isPendingCreateCampaign } =
		useCreateCampaign({
			suppressToasts: true,
		});

	/* VARIABLES */
	const verificationCredits = user?.verificationCredits || 0;
	const UPLOAD_PROGRESS_STATES: string[] = [
		'Parsing contact data',
		'Checking for duplicates',
		'Checking data against existing contacts in the database',
		'Verifying email address validity',
	];
	const isPendingSave =
		isPendingBatchCreateContacts || isPendingCreateContactList || isPendingCreateCampaign;

	const trimKeywords = (keywords: string[]): string[] => {
		return keywords.map((keyword) => keyword.trim());
	};

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = new Uint8Array(e.target?.result as ArrayBuffer);
				const workbook = XLSX.read(data, { type: 'array' });
				const sheetName = workbook.SheetNames[0];
				const worksheet = workbook.Sheets[sheetName];
				const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

				if (jsonData.length < 2) {
					toast.error('Excel file must contain at least a header row and one data row.');
					return;
				}

				const headers = (jsonData[0] as string[]).map(
					(header) => header?.toString().trim().toLowerCase() || ''
				);

				const parsedData = (jsonData.slice(1) as unknown[][])
					.filter((row) =>
						row.some((value) => value !== null && value !== undefined && value !== '')
					)
					.filter((row) => {
						const emailIndex = headers.indexOf('email');
						return (
							emailIndex >= 0 &&
							row[emailIndex] &&
							row[emailIndex].toString().trim() !== ''
						);
					})
					.map((row) => {
						const rowData: Record<string, string | undefined> = {};
						headers.forEach((header, index) => {
							const value = row[index];
							rowData[header] =
								value === '' || value === null || value === undefined
									? undefined
									: value.toString().trim();
						});

						return {
							firstName: rowData.firstname || undefined,
							lastName: rowData.lastname || undefined,
							company: rowData.company || undefined,
							email: rowData.email!,
							address: rowData.address || undefined,
							city: rowData.city || undefined,
							country: rowData.country || undefined,
							state: rowData.state || undefined,
							website: rowData.website || undefined,
							phone: rowData.phone || undefined,
							title: rowData.title || undefined,
							headline: rowData.headline || undefined,
							linkedInUrl: rowData.linkedinurl || undefined,
							photoUrl: rowData.photourl || undefined,
							metadata: rowData.metadata || undefined,
							companyLinkedInUrl: rowData.companylinkedinurl || undefined,
							companyFoundedYear: rowData.companyfoundedyear || undefined,
							companyType: rowData.companytype || undefined,
							companyTechStack: trimKeywords(rowData.companytechstack?.split(',') || []),
							companyPostalCode: rowData.companypostalcode || undefined,
							companyKeywords: trimKeywords(rowData.companykeywords?.split(',') || []),
							companyIndustry: rowData.companyindustry || undefined,
						};
					});

				setLastParsedDataLength(parsedData.length);

				if (parsedData.length > 100) {
					toast.error(
						`You can only upload 100 contacts at a time. Please reduce the number contacts in your file.`
					);

					return;
				}

				if (parsedData.length > verificationCredits) {
					setOpen(false);
					setIsOpenDrawer(true);

					return;
				}

				setTsvData(parsedData);
				toast.success(`Successfully parsed ${parsedData.length} contacts`);
			} catch (error) {
				console.error('Excel parsing failed:', error);
				toast.error('Failed to parse Excel file. Please check the format.');
			}
		};

		reader.onerror = () => {
			toast.error('Failed to read Excel file');
		};

		reader.readAsArrayBuffer(file);
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

		if (!isAdmin && tsvData.length > verificationCredits) {
			toast.error(
				`You do not have enough upload credits to create this many contacts. Please upgrade your plan. Credits: ${verificationCredits} Number of contacts: ${tsvData.length}`
			);
			return;
		}

		(async () => {
			for (let i = 0; i < UPLOAD_PROGRESS_STATES.length; i++) {
				await new Promise((resolve) => setTimeout(resolve, 3000));
				setUploadProgressState(UPLOAD_PROGRESS_STATES[i]);
			}
		})();

		const apiPromise = (async () => {
			const { contacts, created } = await batchCreateContacts({
				isPrivate: !isAdmin,
				contacts: tsvData,
			});

			if (created > 0) {
				const userContactList = await createContactList({
					name: `Excel Upload - ${new Date().toLocaleDateString()}`,
					contactIds: contacts?.map((contact: Contact) => contact.id) || [],
				});
				const campaign = await createCampaign({
					name: `Excel Upload - ${new Date().toLocaleDateString()}`,
					userContactLists: [userContactList.id],
				});
				router.push(urls.murmur.campaign.detail(campaign.id));
			}
			return { contacts, created };
		})();

		await apiPromise;

		setTsvData([]);
		setOpen(false);
	};

	const handleTemplateDownload = () => {
		const link = document.createElement('a');
		link.href = '/sampleContactListExcel.xlsx';
		link.download = 'sampleContactListExcel.xlsx';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleClear = () => {
		setTsvData([]);
	};

	return {
		isPendingSave,
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
		uploadProgressState,
	};
};
