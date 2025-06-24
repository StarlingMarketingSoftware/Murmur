import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext } from 'react-hook-form';

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
						<Textarea className="h-[530px]" placeholder={'Handwritten'} {...field} />
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
};
