'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';

import { cn } from '@/utils';

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
	className,
	variant = 'default',
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay> & {
	variant?: 'default' | 'plain';
}) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn(
				'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 opacity-100',
				variant === 'plain'
					? 'bg-background backdrop-blur-0'
					: 'bg-gradient-to-b from-background to-background/20 backdrop-blur-xs',
				className
			)}
			{...props}
		/>
	);
}

interface DialogContentProps
	extends React.ComponentProps<typeof DialogPrimitive.Content> {
	hideCloseButton?: boolean;
	disableEscapeKeyDown?: boolean;
	disableOutsideClick?: boolean;
	fullScreen?: boolean;
}

function DialogContent({
	className,
	children,
	hideCloseButton = false,
	disableEscapeKeyDown = false,
	disableOutsideClick = false,
	fullScreen = false,
	...props
}: DialogContentProps) {
	return (
		<DialogPortal data-slot="dialog-portal">
			<DialogOverlay variant={fullScreen ? 'plain' : 'default'} />
			<DialogPrimitive.Content
				data-slot="dialog-content"
				onEscapeKeyDown={disableEscapeKeyDown ? (e) => e.preventDefault() : undefined}
				onInteractOutside={disableOutsideClick ? (e) => e.preventDefault() : undefined}
				{...props}
				className={cn(
					'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed z-50 flex flex-col duration-300',
					fullScreen
						? 'inset-0 max-w-none max-h-none rounded-none p-0 overflow-y-auto overflow-x-hidden'
						: 'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 top-[50%] left-[50%] w-full translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border-2 border-primary p-6 max-h-[80vh] max-w-[97vw] md:max-w-[900px] overflow-y-auto overflow-x-hidden',
					className
				)}
				{...props}
			>
				{children}
				<DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6">
					{!hideCloseButton && <XIcon className="h-12 w-12 hover:cursor-pointer" />}
					<span className="sr-only">Close</span>
				</DialogPrimitive.Close>
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="dialog-header"
			className={cn('flex flex-col gap-1 text-center', className)}
			{...props}
		/>
	);
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				'flex gap-2 flex-row justify-center !items-center border-t-1 pt-6',
				className
			)}
			{...props}
		>
			{props.children}
		</div>
	);
}

function DialogTitle({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn(
				'text-lg leading-none font-semibold font-primary text-[30px] ',
				className
			)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn('!text-light-foreground font-secondary !text-base', className)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
