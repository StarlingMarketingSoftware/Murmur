import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { useFormContext } from 'react-hook-form';
import RichTextEditor from '../RichTextEditor/RichTextEditor';

const PLACEHOLDER_OPTIONS = [
	{ value: 'name', label: 'Name' },
	{ value: 'company', label: 'Company' },
	{ value: 'firstName', label: 'First Name' },
	{ value: 'lastName', label: 'Last Name' },
	{ value: 'state', label: 'State' },
	{ value: 'country', label: 'Country' },
	{ value: 'city', label: 'City' },
];

export const HandwrittenPromptInput = () => {
	const form = useFormContext();

	return (
		<FormField
			control={form.control}
			name="handwrittenPrompt"
			render={({ field }) => (
				<FormItem>
					<FormLabel>{'Handwritten'}</FormLabel>
					<FormControl>
						<RichTextEditor
							className="h-[530px]"
							value={field.value}
							onChange={field.onChange}
							showPlaceholders={true}
							placeholderOptions={PLACEHOLDER_OPTIONS}
						/>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
};
