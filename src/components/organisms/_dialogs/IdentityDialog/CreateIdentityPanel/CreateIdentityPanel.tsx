import {
	CreateIdentityPanelProps,
	UpsertIdentityFormValues,
	useCreateIdentityPanel,
} from './useCreateIdentityPanel';

import { Button } from '@/components/ui/button';
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ControllerRenderProps, FormProvider } from 'react-hook-form';
import React, { FC, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/utils/ui';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

interface StyledInputProps {
	field: ControllerRenderProps<UpsertIdentityFormValues>;
	width?: string;
	paddingRight?: string;
	disabled?: boolean;
}

const StyledInput: FC<StyledInputProps> = ({
	field,
	width = 'w-full md:w-[615.75px]',
	paddingRight = '12px',
	disabled = false,
}) => {
	return (
		<div
			className={`${width} h-[44px] rounded-[7px] border-[#7D7D7D] border-[1px] bg-[#FFFFFF] flex items-center`}
		>
			<Input
				className="!bg-transparent !border-0 !outline-none !ring-0 !focus-visible:ring-0 !focus:ring-0 h-full w-full pl-[12px]"
				variant="light"
				rounded={false}
				style={{
					paddingRight: paddingRight,
				}}
				{...field}
				disabled={disabled}
			/>
		</div>
	);
};

export const CreateIdentityPanel: FC<CreateIdentityPanelProps> = (props) => {
	const { onSubmit, form, isPendingSubmit } = useCreateIdentityPanel(props);

	const isMobile = useIsMobile();
	const [isLandscape, setIsLandscape] = useState(false);
	const [viewportHeight, setViewportHeight] = useState<number | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const updateOrientation = () => {
			if (typeof window === 'undefined') return;
			setIsLandscape(window.innerWidth > window.innerHeight);
			setViewportHeight(window.innerHeight);
		};
		updateOrientation();
		window.addEventListener('resize', updateOrientation);
		window.addEventListener('orientationchange', updateOrientation);
		return () => {
			window.removeEventListener('resize', updateOrientation);
			window.removeEventListener('orientationchange', updateOrientation);
		};
	}, []);

	// Detect short landscape heights to compress layout further
	const isShortLandscape = isMobile && isLandscape && (viewportHeight ?? Infinity) <= 420;
	const isVeryShortLandscape =
		isMobile && isLandscape && (viewportHeight ?? Infinity) <= 360;

	// Panel height - simplified since we have fewer fields now
	const panelHeightStyle =
		isMobile && isLandscape
			? {
					height: isVeryShortLandscape ? 'min(200px, 45vh)' : 'min(220px, 50vh)',
					maxHeight: isVeryShortLandscape ? 'min(200px, 45vh)' : 'min(220px, 50vh)',
					minHeight: '150px',
			  }
			: {
					height: '220px',
					maxHeight: '220px',
					minHeight: '150px',
			  };

	// Adjust spacing between form fields when height is constrained
	const formSpacingClass = isVeryShortLandscape
		? 'space-y-2'
		: isShortLandscape
		? 'space-y-3'
		: 'space-y-4';

	// Check if form is valid for submit button
	const isFormValid = form.watch('name')?.trim().length > 0;

	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<div
					className="mx-auto"
					style={{
						width: isMobile && isLandscape ? 'min(651px, 41.43vw)' : 'min(651px, 96vw)',
					}}
				>
					<div
						ref={containerRef}
						className={cn(
							'box-border w-full rounded-[8.81px] border-[2.2px] border-[#000000] relative'
						)}
						style={{
							backgroundColor: '#F4F9FF',
							...panelHeightStyle,
						}}
					>
						<CustomScrollbar
							className="w-full h-full rounded-[6px]"
							contentClassName={cn(
								'scrollbar-hide',
								isVeryShortLandscape ? 'p-3' : 'p-4'
							)}
							disableOverflowClass
							thumbWidth={2}
							thumbColor="#000000"
							trackColor="transparent"
							offsetRight={-5}
						>
							<div className={formSpacingClass} style={{ pointerEvents: 'auto' }}>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className="col-span-11 relative">
											<FormLabel className="font-secondary text-[14px]">
												{'Name (First and Last)*'}
											</FormLabel>
											<FormControl>
												<StyledInput
													field={field}
													width={isMobile && isLandscape ? 'w-full' : undefined}
												/>
											</FormControl>
											<div className="absolute left-0 top-full mt-0.5">
												<FormMessage className="m-0 leading-4" />
											</div>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="website"
									render={({ field }) => (
										<FormItem className="col-span-11">
											<FormLabel className="font-secondary text-[14px]">
												Website Link
											</FormLabel>
											<FormControl>
												<StyledInput
													field={field}
													width={isMobile && isLandscape ? 'w-full' : undefined}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</CustomScrollbar>
					</div>

					{/* Save and continue button - desktop and mobile landscape (in-flow) */}
					<div
						className={cn(
							// Hide on mobile portrait where sticky portal is used
							isMobile && !isLandscape ? 'hidden' : '',
							// Match ExistingProfilesSection pull in mobile landscape
							isMobile && isLandscape ? '-mt-[36px]' : '-mt-[24px]',
							// Always show on desktop
							'md:block'
						)}
						style={{
							marginBottom: isMobile && isLandscape ? 0 : undefined,
						}}
					>
						<Button
							disabled={!isFormValid}
							isLoading={isPendingSubmit}
							type="submit"
							className={cn(
								'z-10 w-full h-[43.05px] rounded-[8.83px] border-[2px] text-white font-bold text-[18.77px] transition-colors hover:!bg-[#4C9E5C] active:!bg-[#428A51] active:translate-y-[1px] disabled:!opacity-100',
								// Nudge slightly lower in mobile landscape
								isMobile && isLandscape ? 'relative -top-[3px]' : 'relative -top-[2px]'
							)}
							style={{
								backgroundColor: '#5DAB68',
								borderColor: '#050505',
								color: '#FFFFFF',
								fontWeight: 700,
								fontSize: '18.77px',
								fontFamily: 'Times New Roman, Times, serif',
							}}
						>
							Save and continue
						</Button>
					</div>

					{/* Spacer to prevent overlap with mobile sticky CTA (portrait only) */}
					{isMobile && !isLandscape ? <div className="md:hidden h-[64px]" /> : null}

					{/* Mobile sticky Save button via portal (portrait only) */}
					{isMobile && !isLandscape && typeof window !== 'undefined'
						? createPortal(
								<div
									className="mobile-sticky-cta"
									style={{
										zIndex: 100500,
										pointerEvents: 'auto',
									}}
									onClick={(e) => {
										e.stopPropagation();
									}}
								>
									<Button
										disabled={!isFormValid}
										isLoading={isPendingSubmit}
										onClick={(e) => {
											e.stopPropagation();
											// Since this button is outside the form, we need to manually trigger the submit
											form.handleSubmit(onSubmit)();
										}}
										onPointerDown={(e) => {
											e.stopPropagation();
										}}
										className="w-full h-[53px] min-h-[53px] !rounded-none !bg-[#5dab68] hover:!bg-[#4e9b5d] !text-white border border-[#050505] transition-colors !opacity-100 disabled:!opacity-100"
										style={{
											pointerEvents: isFormValid ? 'auto' : 'none',
										}}
									>
										Save and continue
									</Button>
								</div>,
								document.body
						  )
						: null}
				</div>
			</form>
		</FormProvider>
	);
};
