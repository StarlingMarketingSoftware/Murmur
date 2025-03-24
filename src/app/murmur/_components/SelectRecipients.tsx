'use client';

import { ContactList } from '@prisma/client';
import ContactListTable from './ContactListTable';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
	Card,
	CardHeader,
	CardDescription,
	CardContent,
	CardFooter,
} from '@/components/ui/card';
import { TypographyH2 } from '@/components/ui/typography';
import { useContactLists } from '@/hooks/useContactLists';

export const columns: ColumnDef<Omit<ContactList, 'id'>>[] = [
	{
		accessorKey: 'category',
		header: 'Category',
	},
	{
		accessorKey: 'count',
		header: 'Count',
	},
];

const SelectRecipients = () => {
	const { data, isPending } = useContactLists();
	console.log('🚀 ~ SelectRecipients ~ data:', data);

	if (isPending) {
		return <Loader2 />;
	}
	return (
		<>
			<TypographyH2>Contact Lists</TypographyH2>
			<Card>
				<CardHeader>
					<CardDescription>
						Select a list to manage or import from Google Contacts.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					{/* <ContactListTable columns={columns} data={data} />; */}
				</CardContent>
				<CardFooter>
					<Button>Save changes</Button>
				</CardFooter>
			</Card>
		</>
	);
};

export default SelectRecipients;
