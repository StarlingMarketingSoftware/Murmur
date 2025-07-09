'use client';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { useEffect } from 'react';

export function SimpleDialog() {
	useEffect(() => {
		console.log(document.querySelectorAll('[data-radix-portal]').length);
	}, []);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="primary-light">Open</Button>
			</DialogTrigger>
			<DialogContent
				onClick={(e) => {
					console.log('Dialog clicked', e);
				}}
			>
				<DialogHeader>
					<DialogTitle>Test Dialog</DialogTitle>
					<DialogDescription>
						This should close when clicking the X or outside
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
