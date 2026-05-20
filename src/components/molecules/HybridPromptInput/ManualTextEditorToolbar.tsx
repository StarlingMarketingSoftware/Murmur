import { FC, useCallback, useEffect, useRef, useState } from 'react';
import type { Font } from '@/types';
import { DEFAULT_FONT, FONT_OPTIONS } from '@/constants/ui';
import { cn } from '@/utils';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import FontDropdownArrow from '@/components/atoms/_svg/FontDropdownArrow';
import FontSizeIcon from '@/components/atoms/_svg/FontSizeIcon';
import BoldIcon from '@/components/atoms/_svg/BoldIcon';
import ItalicIcon from '@/components/atoms/_svg/ItalicIcon';
import UnderlineIcon from '@/components/atoms/_svg/UnderlineIcon';
import BulletListIcon from '@/components/atoms/_svg/BulletListIcon';
import TextColorIcon from '@/components/atoms/_svg/TextColorIcon';

const MANUAL_EDITOR_COLOR_SWATCHES = [
	'#000000',
	'#444444',
	'#666666',
	'#999999',
	'#B7B7B7',
	'#CCCCCC',
	'#EEEEEE',
	'#FFFFFF',
	'#FF0000',
	'#FF9900',
	'#FFFF00',
	'#00FF00',
	'#00FFFF',
	'#0000FF',
	'#9900FF',
	'#FF00FF',
	'#F4CCCC',
	'#FCE5CD',
	'#FFF2CC',
	'#D9EAD3',
	'#D0E0E3',
	'#CFE2F3',
	'#D9D2E9',
	'#EAD1DC',
	'#EA9999',
	'#F9CB9C',
	'#FFE599',
	'#B6D7A8',
	'#A2C4C9',
	'#9FC5E8',
	'#B4A7D6',
	'#D5A6BD',
	'#E06666',
	'#F6B26B',
	'#FFD966',
	'#93C47D',
	'#76A5AF',
	'#6FA8DC',
	'#8E7CC3',
	'#C27BA0',
	'#CC0000',
	'#E69138',
	'#F1C232',
	'#6AA84F',
	'#45818E',
	'#3D85C6',
	'#674EA7',
	'#A64D79',
	'#990000',
	'#B45F06',
	'#BF9000',
	'#38761D',
	'#134F5C',
	'#0B5394',
	'#351C75',
	'#741B47',
	'#660000',
	'#783F04',
	'#7F6000',
	'#274E13',
	'#0C343D',
	'#073763',
	'#20124D',
	'#4C1130',
] as const;

export const MANUAL_TOOLBAR_BASE_WIDTH = 430;
export const MANUAL_TOOLBAR_BASE_HEIGHT = 32;
export const MANUAL_EDITOR_FONT_SIZE_OPTIONS = [
	8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 36,
] as const;
export const DEFAULT_MANUAL_EDITOR_FONT_SIZE = 12;
export const DEFAULT_MANUAL_EDITOR_FILL_INS = ['Company', 'State', 'City'] as const;

export type ManualTextEditorFormatting = {
	bold: boolean;
	italic: boolean;
	underline: boolean;
	bulletList: boolean;
};

export type ManualTextEditorCommand =
	| 'bold'
	| 'italic'
	| 'underline'
	| 'insertUnorderedList';
export type ManualTextEditorColorCommand = 'foreColor' | 'hiliteColor';
export type ManualTextEditorFillIn = (typeof DEFAULT_MANUAL_EDITOR_FILL_INS)[number];

type ManualTextEditorToolbarProps = {
	idPrefix: string;
	font: Font;
	fontSize: number;
	activeFormatting: ManualTextEditorFormatting;
	selectedTextColor?: string | null;
	selectedBgColor?: string | null;
	isLinkActive?: boolean;
	fillInOptions?: readonly ManualTextEditorFillIn[];
	scale?: number;
	className?: string;
	onFontChange: (font: Font) => void;
	onFontSizeChange: (size: number) => void;
	onFormat: (command: ManualTextEditorCommand) => void;
	onColor: (command: ManualTextEditorColorCommand, color: string) => void;
	onOpenLink: () => void;
	onInsertFillIn: (fillIn: ManualTextEditorFillIn) => void;
};

const getFontLabel = (font: Font) => {
	if (font === 'Arial') return 'Sans Serif';
	if (font === 'serif') return 'Serif';
	if (font === 'Courier New') return 'Fixed Width';
	if (font === 'Arial Black') return 'Wide';
	if (font === 'Arial Narrow') return 'Narrow';
	return font;
};

const LinkIcon: FC = () => (
	<svg
		width={18}
		height={18}
		viewBox="0 0 23 23"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			d="M3.0751 14.325C2.3251 13.575 1.8001 12.45 1.8001 11.25C1.8001 10.05 2.2501 8.99996 3.0751 8.17496C3.9001 7.34996 4.9501 6.89996 6.1501 6.89996H9.0001C9.3001 6.89996 9.5251 7.12497 9.5251 7.42497C9.5251 7.72497 9.30011 7.94996 9.00011 7.94996L6.1501 7.94997C5.2501 7.94997 4.5001 8.24996 3.8251 8.92496C3.1501 9.59996 2.8501 10.35 2.8501 11.25C2.8501 13.05 4.3501 14.55 6.0751 14.475H8.9251C9.2251 14.475 9.4501 14.7 9.4501 15C9.4501 15.3 9.22511 15.525 8.92511 15.525L6.0751 15.525C4.9501 15.6 3.9001 15.15 3.0751 14.325Z"
			fill="#231815"
		/>
		<path
			d="M13.3503 15.45C13.2753 15.375 13.1253 15.225 13.1253 15.075C13.1253 14.775 13.3503 14.55 13.6503 14.55L16.5003 14.55C18.3003 14.55 19.7253 13.125 19.7253 11.325C19.7253 9.52499 18.3003 8.09999 16.5003 8.09999L13.6503 8.09999C13.3503 8.09999 13.1253 7.87499 13.1253 7.57499C13.1253 7.27499 13.3503 7.04999 13.6503 7.04999L16.5003 7.04999C18.9003 7.04999 20.7753 8.92499 20.7753 11.325C20.7753 13.725 18.9003 15.6 16.5003 15.6H13.6503C13.5003 15.6 13.4253 15.525 13.3503 15.45Z"
			fill="#231815"
		/>
		<path
			d="M5.70029 11.7C5.62529 11.625 5.47529 11.475 5.47529 11.325C5.47529 11.025 5.70029 10.8 6.00029 10.8L16.3503 10.8C16.6503 10.8 16.8753 11.025 16.8753 11.325C16.8753 11.625 16.6503 11.85 16.3503 11.85L6.00029 11.85C6.00029 11.85 5.85029 11.85 5.70029 11.7Z"
			fill="#231815"
		/>
	</svg>
);

export const ManualTextEditorToolbar: FC<ManualTextEditorToolbarProps> = ({
	idPrefix,
	font,
	fontSize,
	activeFormatting,
	selectedTextColor,
	selectedBgColor,
	isLinkActive = false,
	fillInOptions = DEFAULT_MANUAL_EDITOR_FILL_INS,
	scale = 1,
	className,
	onFontChange,
	onFontSizeChange,
	onFormat,
	onColor,
	onOpenLink,
	onInsertFillIn,
}) => {
	const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
	const [isFontSizeDropdownOpen, setIsFontSizeDropdownOpen] = useState(false);
	const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
	const [isFillInsDropdownOpen, setIsFillInsDropdownOpen] = useState(false);
	const fontDropdownRef = useRef<HTMLDivElement>(null);
	const fontSizeDropdownRef = useRef<HTMLDivElement>(null);
	const colorPickerRef = useRef<HTMLDivElement>(null);
	const fillInsDropdownRef = useRef<HTMLDivElement>(null);

	const closeDropdowns = useCallback(() => {
		setIsFontDropdownOpen(false);
		setIsFontSizeDropdownOpen(false);
		setIsColorPickerOpen(false);
		setIsFillInsDropdownOpen(false);
	}, []);

	useEffect(() => {
		const handleMouseDown = (e: MouseEvent) => {
			const target = e.target as Node;
			if (isFontDropdownOpen && !fontDropdownRef.current?.contains(target)) {
				setIsFontDropdownOpen(false);
			}
			if (isFontSizeDropdownOpen && !fontSizeDropdownRef.current?.contains(target)) {
				setIsFontSizeDropdownOpen(false);
			}
			if (isColorPickerOpen && !colorPickerRef.current?.contains(target)) {
				setIsColorPickerOpen(false);
			}
			if (isFillInsDropdownOpen && !fillInsDropdownRef.current?.contains(target)) {
				setIsFillInsDropdownOpen(false);
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeDropdowns();
		};

		document.addEventListener('mousedown', handleMouseDown);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleMouseDown);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [
		closeDropdowns,
		isColorPickerOpen,
		isFillInsDropdownOpen,
		isFontDropdownOpen,
		isFontSizeDropdownOpen,
	]);

	return (
		<div
			className={className}
			style={{
				width: MANUAL_TOOLBAR_BASE_WIDTH * scale,
				height: MANUAL_TOOLBAR_BASE_HEIGHT * scale,
			}}
		>
			<div
				style={{
					width: MANUAL_TOOLBAR_BASE_WIDTH,
					height: MANUAL_TOOLBAR_BASE_HEIGHT,
					transform: `scale(${scale})`,
					transformOrigin: 'top left',
				}}
			>
				<div
					className="w-[430px] h-[32px] rounded-[16px] bg-[#DDE6F5] relative flex items-center overflow-visible"
					style={{ backgroundColor: '#DDE6F5' }}
				>
					<div
						ref={fontDropdownRef}
						className="w-[109px] h-full flex items-center pl-[8px] pr-0 relative"
					>
						<button
							type="button"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => {
								setIsFontSizeDropdownOpen(false);
								setIsColorPickerOpen(false);
								setIsFillInsDropdownOpen(false);
								setIsFontDropdownOpen((v) => !v);
							}}
							className={cn(
								'h-[24px] flex items-center',
								'bg-transparent border-0 shadow-none rounded-[4px]',
								'pl-[8px] pr-[6px] relative cursor-pointer',
								'font-inter font-normal text-[14px] leading-none text-black',
								'transition-[background-color,transform] duration-[80ms] ease-out',
								'hover:bg-[#c9d4e8] hover:scale-[1.01] active:scale-100 focus:outline-none',
								isFontDropdownOpen && 'bg-[#c9d4e8]'
							)}
							style={{ fontFamily: font || DEFAULT_FONT }}
							aria-label="Font"
							aria-expanded={isFontDropdownOpen}
						>
							<div
								className="flex items-center min-w-0 overflow-hidden pr-[2px] whitespace-nowrap"
								style={{
									maskImage: 'linear-gradient(to right, black 70%, transparent 95%)',
									WebkitMaskImage:
										'linear-gradient(to right, black 70%, transparent 95%)',
								}}
							>
								<span>{getFontLabel(font || DEFAULT_FONT)}</span>
							</div>
							<FontDropdownArrow className="!block pointer-events-none ml-[6px] !w-[8px] !h-[5px]" />
						</button>

						{isFontDropdownOpen && (
							<div
								id={`${idPrefix}-font-dropdown-scroll-wrapper`}
								className={cn(
									'absolute w-[119px] overflow-visible',
									'rounded-[8px] bg-[#E0E0E0]',
									'z-[9999]'
								)}
								style={{ left: '0px', bottom: 'calc(100% + 8px)', height: '161px' }}
							>
								<style>{`
									#${idPrefix}-font-dropdown-scroll-wrapper *::-webkit-scrollbar {
										display: none !important;
										width: 0 !important;
										height: 0 !important;
										background: transparent !important;
									}
									#${idPrefix}-font-dropdown-scroll-wrapper * {
										-ms-overflow-style: none !important;
										scrollbar-width: none !important;
									}
								`}</style>
								<CustomScrollbar
									className="w-full h-full"
									thumbColor="#000000"
									thumbWidth={2}
									offsetRight={-6}
								>
									{FONT_OPTIONS.map((fontOption) => {
										const isSelected = (font || DEFAULT_FONT) === fontOption;
										return (
											<button
												key={fontOption}
												type="button"
												onMouseDown={(e) => e.preventDefault()}
												onClick={() => {
													onFontChange(fontOption);
													setIsFontDropdownOpen(false);
												}}
												className={cn(
													'w-full px-2 py-1.5 text-left text-[12px] leading-none',
													'hover:bg-gray-300 cursor-pointer',
													isSelected && 'bg-gray-300/60'
												)}
												style={{ fontFamily: fontOption }}
											>
												<span>{getFontLabel(fontOption)}</span>
											</button>
										);
									})}
								</CustomScrollbar>
							</div>
						)}
					</div>

					<div
						aria-hidden="true"
						className="absolute left-[109px] top-1/2 -translate-y-1/2 w-px h-[23px] bg-black"
					/>

					<div
						ref={fontSizeDropdownRef}
						className="absolute left-[111px] top-0 bottom-0 w-[40px] flex items-center justify-center"
					>
						<button
							type="button"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => {
								setIsFontDropdownOpen(false);
								setIsColorPickerOpen(false);
								setIsFillInsDropdownOpen(false);
								setIsFontSizeDropdownOpen((v) => !v);
							}}
							className={cn(
								'h-[24px] flex items-center justify-center gap-[5px]',
								'bg-transparent border-0 shadow-none rounded-[4px]',
								'px-[6px] cursor-pointer',
								'transition-[background-color,transform] duration-[80ms] ease-out',
								'hover:bg-[#c9d4e8] hover:scale-[1.01] active:scale-100 focus:outline-none',
								isFontSizeDropdownOpen && 'bg-[#c9d4e8]'
							)}
							aria-label="Font Size"
							aria-expanded={isFontSizeDropdownOpen}
						>
							<FontSizeIcon width={12} height={12} />
							<FontDropdownArrow className="!block pointer-events-none !w-[8px] !h-[5px] relative top-[1px]" />
						</button>

						{isFontSizeDropdownOpen && (
							<div
								id={`${idPrefix}-font-size-dropdown-scroll-wrapper`}
								className={cn(
									'absolute w-[50px] overflow-visible',
									'rounded-[8px] bg-[#E0E0E0]',
									'z-[9999]'
								)}
								style={{
									left: '50%',
									transform: 'translateX(-50%)',
									bottom: 'calc(100% + 8px)',
									height: '161px',
								}}
							>
								<style>{`
									#${idPrefix}-font-size-dropdown-scroll-wrapper *::-webkit-scrollbar {
										display: none !important;
										width: 0 !important;
										height: 0 !important;
										background: transparent !important;
									}
									#${idPrefix}-font-size-dropdown-scroll-wrapper * {
										-ms-overflow-style: none !important;
										scrollbar-width: none !important;
									}
								`}</style>
								<CustomScrollbar
									className="w-full h-full"
									thumbColor="#000000"
									thumbWidth={2}
									offsetRight={-6}
								>
									{MANUAL_EDITOR_FONT_SIZE_OPTIONS.map((size) => {
										const isSelected = fontSize === size;
										return (
											<button
												key={size}
												type="button"
												onMouseDown={(e) => e.preventDefault()}
												onClick={() => {
													onFontSizeChange(size);
													setIsFontSizeDropdownOpen(false);
												}}
												className={cn(
													'w-full px-2 py-1.5 text-center text-[12px] leading-none',
													'hover:bg-gray-300 cursor-pointer',
													isSelected && 'bg-gray-300/60 font-semibold'
												)}
											>
												<span>{size}</span>
											</button>
										);
									})}
								</CustomScrollbar>
							</div>
						)}
					</div>

					<div
						aria-hidden="true"
						className="absolute left-[151px] top-1/2 -translate-y-1/2 w-px h-[23px] bg-black"
					/>

					<button
						type="button"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => onFormat('bold')}
						className={cn(
							'absolute left-[159px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer rounded-[4px]',
							'transition-[background-color,transform] duration-[80ms] ease-out',
							activeFormatting.bold
								? 'bg-[#B8C8E0]'
								: 'hover:bg-[#C5D3E8] hover:scale-[1.08] active:scale-100'
						)}
						aria-label="Bold"
					>
						<BoldIcon width={8} height={11} />
					</button>

					<button
						type="button"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => onFormat('italic')}
						className={cn(
							'absolute left-[183px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer rounded-[4px]',
							'transition-[background-color,transform] duration-[80ms] ease-out',
							activeFormatting.italic
								? 'bg-[#B8C8E0]'
								: 'hover:bg-[#C5D3E8] hover:scale-[1.08] active:scale-100'
						)}
						aria-label="Italic"
					>
						<ItalicIcon width={4} height={11} />
					</button>

					<button
						type="button"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => onFormat('underline')}
						className={cn(
							'absolute left-[207px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer rounded-[4px]',
							'transition-[background-color,transform] duration-[80ms] ease-out',
							activeFormatting.underline
								? 'bg-[#B8C8E0]'
								: 'hover:bg-[#C5D3E8] hover:scale-[1.08] active:scale-100'
						)}
						aria-label="Underline"
					>
						<UnderlineIcon width={11} height={14} />
					</button>

					<button
						type="button"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => onFormat('insertUnorderedList')}
						className={cn(
							'absolute left-[236px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer rounded-[4px]',
							'transition-[background-color,transform] duration-[80ms] ease-out',
							activeFormatting.bulletList
								? 'bg-[#B8C8E0]'
								: 'hover:bg-[#C5D3E8] hover:scale-[1.08] active:scale-100'
						)}
						aria-label="Bullet list"
					>
						<BulletListIcon width={15} height={11} />
					</button>

					<div
						ref={colorPickerRef}
						className="absolute left-[260px] top-[4px] w-[32px] h-[24px] flex items-center justify-center"
					>
						<button
							type="button"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => {
								setIsFontDropdownOpen(false);
								setIsFontSizeDropdownOpen(false);
								setIsFillInsDropdownOpen(false);
								setIsColorPickerOpen((v) => !v);
							}}
							className={cn(
								'w-[24px] h-[24px] flex items-center justify-center cursor-pointer rounded-[4px]',
								'transition-[background-color,transform] duration-[80ms] ease-out',
								isColorPickerOpen
									? 'bg-[#B8C8E0]'
									: 'hover:bg-[#C5D3E8] hover:scale-[1.08] active:scale-100'
							)}
							aria-label="Text & background color"
							aria-expanded={isColorPickerOpen}
						>
							<TextColorIcon width={11} height={14} />
						</button>

						{isColorPickerOpen && (
							<div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-[9999]">
								<div className="flex gap-6 rounded-[8px] bg-[#E0E0E0] p-3">
									<div className="min-w-[150px]">
										<div className="mb-2 text-[12px] font-inter font-medium text-black/80">
											Background color
										</div>
										<div className="grid grid-cols-8 gap-[4px]">
											{MANUAL_EDITOR_COLOR_SWATCHES.map((color) => {
												const isSelected =
													(selectedBgColor ?? '').toLowerCase() === color.toLowerCase();
												return (
													<button
														key={`${idPrefix}-bg-${color}`}
														type="button"
														onMouseDown={(e) => e.preventDefault()}
														onClick={() => onColor('hiliteColor', color)}
														className={cn(
															'w-[14px] h-[14px] rounded-[2px] border border-black/10 hover:outline hover:outline-2 hover:outline-black/20',
															isSelected &&
																'ring-2 ring-black ring-offset-1 ring-offset-white border-transparent'
														)}
														style={{ backgroundColor: color }}
														aria-label={`Background ${color}`}
														aria-pressed={isSelected}
													/>
												);
											})}
										</div>
									</div>

									<div className="min-w-[150px]">
										<div className="mb-2 text-[12px] font-inter font-medium text-black/80">
											Text color
										</div>
										<div className="grid grid-cols-8 gap-[4px]">
											{MANUAL_EDITOR_COLOR_SWATCHES.map((color) => {
												const isSelected =
													(selectedTextColor ?? '').toLowerCase() === color.toLowerCase();
												return (
													<button
														key={`${idPrefix}-text-${color}`}
														type="button"
														onMouseDown={(e) => e.preventDefault()}
														onClick={() => onColor('foreColor', color)}
														className={cn(
															'w-[14px] h-[14px] rounded-[2px] border border-black/10 hover:outline hover:outline-2 hover:outline-black/20',
															isSelected &&
																'ring-2 ring-black ring-offset-1 ring-offset-white border-transparent'
														)}
														style={{ backgroundColor: color }}
														aria-label={`Text ${color}`}
														aria-pressed={isSelected}
													/>
												);
											})}
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					<button
						type="button"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => {
							closeDropdowns();
							onOpenLink();
						}}
						className={cn(
							'absolute left-[295px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer rounded-[4px]',
							'transition-[background-color,transform] duration-[80ms] ease-out',
							isLinkActive
								? 'bg-[#B8C8E0]'
								: 'hover:bg-[#C5D3E8] hover:scale-[1.08] active:scale-100'
						)}
						aria-label="Insert link"
					>
						<LinkIcon />
					</button>

					<div
						aria-hidden="true"
						className="absolute right-[102px] top-1/2 -translate-y-1/2 w-px h-[23px] bg-black"
					/>

					<div
						ref={fillInsDropdownRef}
						className="absolute right-[24px] top-0 h-full flex items-center"
					>
						<button
							type="button"
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => {
								setIsFontDropdownOpen(false);
								setIsFontSizeDropdownOpen(false);
								setIsColorPickerOpen(false);
								setIsFillInsDropdownOpen((v) => !v);
							}}
							className={cn(
								'h-[24px] flex items-center cursor-pointer bg-transparent border-0 px-[8px] rounded-[4px]',
								'transition-[background-color,transform] duration-[80ms] ease-out',
								'hover:bg-[#c9d4e8] hover:scale-[1.01] active:scale-100',
								isFillInsDropdownOpen && 'bg-[#c9d4e8]'
							)}
							aria-label="Fill-ins"
							aria-expanded={isFillInsDropdownOpen}
						>
							<span className="font-inter font-medium text-[14px] leading-none text-black">
								Fill-ins
							</span>
							<FontDropdownArrow className="!block pointer-events-none ml-[6px] !w-[8px] !h-[5px] relative top-[3px]" />
						</button>

						{isFillInsDropdownOpen && (
							<div
								className={cn(
									'absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-[9999]',
									'rounded-[8px] bg-[#E0E0E0] py-1 min-w-[100px] shadow-md'
								)}
							>
								{fillInOptions.map((option) => (
									<button
										key={option}
										type="button"
										onMouseDown={(e) => e.preventDefault()}
										onClick={() => {
											onInsertFillIn(option);
											setIsFillInsDropdownOpen(false);
										}}
										className={cn(
											'w-full px-3 py-2 text-left text-[13px] font-inter',
											'hover:bg-gray-300 cursor-pointer',
											'text-black'
										)}
									>
										{option}
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
