import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
	Form,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TypographyH2, TypographyH3 } from '@/components/ui/typography';
import { emailDraftSchema } from '@/constants/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Brain, PenLine } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type DraftMode = 'ai' | 'compose';

const Draft = () => {
	const [isAiDraft, setIsAiDraft] = useState<boolean>(true);
	const [isAiSubject, setIsAiSubject] = useState<boolean>(true);

	// const handleModeClick = () => {
	// 	if (modeValue === 'ai') {
	// 		toast.info('Mode switched to Compose.');
	// 	} else {
	// 		toast.info('Mode switched to AI Draft.');
	// 	}
	// };

	const form = useForm<z.infer<typeof emailDraftSchema>>({
		resolver: zodResolver(emailDraftSchema),
		defaultValues: {
			subject: '',
			message: '',
		},
		// mode: aiDraft === 'ai' ? 'none' : 'onSubmit',
	});

	const onSubmit = async (values: z.infer<typeof emailDraftSchema>) => {
		console.log(values);
		// save the message maybe
	};

	return (
		<>
			<Card>
				<CardContent className="space-y-2">
					<ToggleGroup
						// onClick={handleModeClick}
						variant="outline"
						className="mx-auto"
						type="single"
						size="lg"
						value={isAiDraft ? 'ai' : 'compose'}
						onValueChange={(value) => setIsAiDraft(value === 'ai')}
					>
						<ToggleGroupItem value="ai">
							<Brain />
							AI Draft
						</ToggleGroupItem>
						<ToggleGroupItem value="compose">
							<PenLine />
							Compose
						</ToggleGroupItem>
					</ToggleGroup>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
							<div className="m-0 grid grid-cols-12 gap-4 items-center">
								<FormField
									control={form.control}
									name="subject"
									render={({ field }) => (
										<FormItem className="col-span-11">
											<FormLabel>Subject</FormLabel>
											<FormControl>
												<Input
													className="flex-grow"
													placeholder={
														isAiSubject ? 'AI-generated subject...' : 'Enter subject...'
													}
													disabled={isAiDraft && isAiSubject}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Toggle
									className="w-5 -translate-y-1"
									pressed={isAiSubject}
									onPressedChange={() => setIsAiSubject(!isAiSubject)}
									disabled={!isAiDraft}
								>
									<Brain />
								</Toggle>
							</div>
							<FormField
								control={form.control}
								name="message"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Message</FormLabel>
										<FormControl>
											<Textarea
												className="h-[200px]"
												placeholder={isAiDraft ? 'Prompt our AI...' : 'Draft an email...'}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit">{isAiDraft ? 'Generate' : 'Save Draft'}</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<TypographyH3>Drafts</TypographyH3>
				</CardHeader>
				<CardContent></CardContent>
			</Card>
		</>
	);
};

export default Draft;
