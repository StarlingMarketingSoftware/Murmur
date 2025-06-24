import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext } from 'react-hook-form';

export const HybridPromptInput = () => {
	const form = useFormContext();
	return (
		<FormField
			control={form.control}
			name="hybridPrompt"
			render={({ field }) => (
				<FormItem>
					<FormLabel>{'AI Prompt'}</FormLabel>
					<FormControl>
						<Textarea className="h-[530px]" placeholder={'Hybrid '} {...field} />
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
};
