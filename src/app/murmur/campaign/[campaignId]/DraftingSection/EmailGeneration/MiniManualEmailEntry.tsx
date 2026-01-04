import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { DraftingFormValues } from '../useDraftingSection';
import { cn } from '@/utils';
import { DEFAULT_FONT, FONT_OPTIONS } from '@/constants/ui';
import { Textarea } from '@/components/ui/textarea';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import FontDropdownArrow from '@/components/atoms/_svg/FontDropdownArrow';
import FontSizeIcon from '@/components/atoms/_svg/FontSizeIcon';
import BoldIcon from '@/components/atoms/_svg/BoldIcon';
import ItalicIcon from '@/components/atoms/_svg/ItalicIcon';
import UnderlineIcon from '@/components/atoms/_svg/UnderlineIcon';
import BulletListIcon from '@/components/atoms/_svg/BulletListIcon';
import TextColorIcon from '@/components/atoms/_svg/TextColorIcon';
import { HybridBlock } from '@prisma/client';
 
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
 
const FONT_SIZE_OPTIONS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 36] as const;
const DEFAULT_FONT_SIZE = 12;
const FILL_IN_OPTIONS = ['Company', 'State', 'City'] as const;
const MANUAL_TOOLBAR_BASE_WIDTH = 430;
const MANUAL_TOOLBAR_BASE_HEIGHT = 32;
 
export function MiniManualEmailEntry({ form }: { form: UseFormReturn<DraftingFormValues> }) {
	// Custom dropdown state (to avoid Radix positioning issues with zoom)
	const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
	const fontDropdownRef = useRef<HTMLDivElement>(null);
 
	const [isFontSizeDropdownOpen, setIsFontSizeDropdownOpen] = useState(false);
	const fontSizeDropdownRef = useRef<HTMLDivElement>(null);
 
	const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
	const colorPickerRef = useRef<HTMLDivElement>(null);
	const [manualSelectedTextColor, setManualSelectedTextColor] = useState<string | null>(null);
	const [manualSelectedBgColor, setManualSelectedBgColor] = useState<string | null>(null);
 
	const [isFillInsDropdownOpen, setIsFillInsDropdownOpen] = useState(false);
	const fillInsDropdownRef = useRef<HTMLDivElement>(null);
 
	// Link popover state
	const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
	const linkPopoverRef = useRef<HTMLDivElement>(null);
	const [linkText, setLinkText] = useState('');
	const [linkUrl, setLinkUrl] = useState('');
	const [savedRange, setSavedRange] = useState<Range | null>(null);
	const [linkPopoverPosition, setLinkPopoverPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);
 
	// Manual body editor ref (contentEditable)
	const manualBodyEditorRef = useRef<HTMLDivElement>(null);
 
	// Track active formatting state
	const [activeFormatting, setActiveFormatting] = useState({
		bold: false,
		italic: false,
		underline: false,
		bulletList: false,
	});

	// Scale the toolbar to always fit inside the mini panel (keeps layout identical to HybridPromptInput)
	const manualToolbarMeasureRef = useRef<HTMLDivElement>(null);
	const [manualToolbarScale, setManualToolbarScale] = useState(1);

	useLayoutEffect(() => {
		const el = manualToolbarMeasureRef.current;
		if (!el) return;

		const update = () => {
			const available = el.getBoundingClientRect().width;
			const next = Math.min(1, Math.max(0.5, (available - 2) / MANUAL_TOOLBAR_BASE_WIDTH));
			setManualToolbarScale(next);
		};

		update();
		const ro = new ResizeObserver(() => update());
		ro.observe(el);
		window.addEventListener('resize', update);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', update);
		};
	}, []);
 
	// Ensure there is always a block at hybridBlockPrompts.0 (manual editor stores HTML there)
	useEffect(() => {
		const blocks = form.getValues('hybridBlockPrompts') || [];
		if (blocks.length > 0) return;
		form.setValue(
			'hybridBlockPrompts',
			[{ id: `text-${Date.now()}`, type: 'text' as HybridBlock, value: '' }],
			{ shouldDirty: true }
		);
	}, [form]);
 
	// Initialize editor HTML on mount
	useEffect(() => {
		const editor = manualBodyEditorRef.current;
		if (!editor) return;
		const currentValue = form.getValues('hybridBlockPrompts.0.value') || '';
		editor.innerHTML = currentValue;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
 
	const updateActiveFormatting = useCallback(() => {
		setActiveFormatting({
			bold: document.queryCommandState('bold'),
			italic: document.queryCommandState('italic'),
			underline: document.queryCommandState('underline'),
			bulletList: document.queryCommandState('insertUnorderedList'),
		});
	}, []);
 
	// Listen for selection changes to update formatting state
	useEffect(() => {
		const handleSelectionChange = () => updateActiveFormatting();
		document.addEventListener('selectionchange', handleSelectionChange);
		return () => document.removeEventListener('selectionchange', handleSelectionChange);
	}, [updateActiveFormatting]);
 
	const sanitizeBannedFillIns = useCallback((html: string): string => {
		let sanitized = html.replace(/\{\{email\}\}/gi, '');
		sanitized = sanitized.replace(/\{\{phone\}\}/gi, '');
		sanitized = sanitized.replace(
			/<span[^>]*data-fill-in="(email|phone)"[^>]*>[^<]*<\/span>/gi,
			''
		);
		return sanitized;
	}, []);
 
	const syncEditorToForm = useCallback(() => {
		const rawHtml = manualBodyEditorRef.current?.innerHTML || '';
		const html = sanitizeBannedFillIns(rawHtml);
		if (html !== rawHtml && manualBodyEditorRef.current) {
			manualBodyEditorRef.current.innerHTML = html;
			// Try to keep cursor at end (best-effort)
			try {
				const selection = window.getSelection();
				const range = document.createRange();
				range.selectNodeContents(manualBodyEditorRef.current);
				range.collapse(false);
				selection?.removeAllRanges();
				selection?.addRange(range);
			} catch {}
		}
		form.setValue('hybridBlockPrompts.0.value', html, { shouldDirty: true });
	}, [form, sanitizeBannedFillIns]);
 
	const applyManualFormatting = useCallback(
		(command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList') => {
			const editor = manualBodyEditorRef.current;
			if (!editor) return;
			editor.focus();
			document.execCommand(command, false);
			updateActiveFormatting();
			syncEditorToForm();
		},
		[syncEditorToForm, updateActiveFormatting]
	);
 
	const applyManualColor = useCallback(
		(command: 'foreColor' | 'hiliteColor', color: string) => {
			const editor = manualBodyEditorRef.current;
			if (!editor) return;
 
			editor.focus();
 
			try {
				document.execCommand('styleWithCSS', false, 'true');
			} catch {
				// ignore (not supported everywhere)
			}
 
			if (command === 'hiliteColor') {
				setManualSelectedBgColor(color);
				const ok = document.execCommand('hiliteColor', false, color);
				if (!ok) {
					document.execCommand('backColor', false, color);
				}
			} else {
				setManualSelectedTextColor(color);
				document.execCommand('foreColor', false, color);
			}
 
			updateActiveFormatting();
			syncEditorToForm();
		},
		[syncEditorToForm, updateActiveFormatting]
	);
 
	const insertFillIn = useCallback(
		(fillInType: (typeof FILL_IN_OPTIONS)[number]) => {
			const editor = manualBodyEditorRef.current;
			if (!editor) return;
			editor.focus();
 
			const selection = window.getSelection();
			let range: Range;
			if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
				range = document.createRange();
				range.selectNodeContents(editor);
				range.collapse(false);
				if (selection) {
					selection.removeAllRanges();
					selection.addRange(range);
				}
			} else {
				range = selection.getRangeAt(0);
			}
 
			const fillInHtml = `<span contenteditable="false" data-fill-in="${fillInType}" style="display: inline-block; background-color: #E8EFFF; color: #000000; padding: 2px 8px; border-radius: 6px; border: 1px solid #000000; font-size: 12px; font-family: Inter, sans-serif; font-weight: 500; margin: 0 2px; user-select: all; vertical-align: baseline;">${fillInType}</span>`;
			document.execCommand('insertHTML', false, fillInHtml);
 
			syncEditorToForm();
			setIsFillInsDropdownOpen(false);
		},
		[syncEditorToForm]
	);
 
	const openLinkPopover = useCallback(() => {
		const editor = manualBodyEditorRef.current;
		if (!editor) return;
 
		editor.focus();
 
		let selection = window.getSelection();
		let range: Range;
 
		if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
			range = document.createRange();
			range.selectNodeContents(editor);
			range.collapse(false);
			selection = window.getSelection();
			if (selection) {
				selection.removeAllRanges();
				selection.addRange(range);
			}
		} else {
			range = selection.getRangeAt(0);
		}
 
		setSavedRange(range.cloneRange());
		const selectedText = selection?.toString() || '';
		setLinkText(selectedText);
		setLinkUrl('');
 
		const rect = range.getBoundingClientRect();
		const editorRect = editor.getBoundingClientRect();
 
		const popoverTop = rect.height > 0 ? rect.bottom - editorRect.top + 8 : 40;
		const popoverLeft = rect.width > 0 || rect.left > 0 ? Math.max(0, rect.left - editorRect.left) : 0;
 
		setLinkPopoverPosition({
			top: popoverTop,
			left: Math.min(popoverLeft, 140),
		});
 
		// Close other dropdowns
		setIsFontDropdownOpen(false);
		setIsFontSizeDropdownOpen(false);
		setIsColorPickerOpen(false);
		setIsFillInsDropdownOpen(false);
 
		setIsLinkPopoverOpen(true);
	}, []);
 
	const applyLink = useCallback(() => {
		const editor = manualBodyEditorRef.current;
		if (!editor || !linkUrl.trim()) return;
 
		const normalizedUrl =
			linkUrl.startsWith('http://') || linkUrl.startsWith('https://')
				? linkUrl
				: `https://${linkUrl}`;
		const displayText = linkText.trim() || normalizedUrl;
 
		editor.focus();
 
		if (savedRange) {
			const selection = window.getSelection();
			if (selection) {
				selection.removeAllRanges();
				selection.addRange(savedRange);
			}
		}
 
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const selectedContent = selection.toString();
			if (selectedContent) range.deleteContents();
 
			const linkElement = document.createElement('a');
			linkElement.href = normalizedUrl;
			linkElement.textContent = displayText;
			linkElement.target = '_blank';
			linkElement.rel = 'noopener noreferrer';
			linkElement.style.color = '#0066cc';
			linkElement.style.textDecoration = 'underline';
			range.insertNode(linkElement);
 
			range.setStartAfter(linkElement);
			range.setEndAfter(linkElement);
			selection.removeAllRanges();
			selection.addRange(range);
		} else {
			const linkElement = document.createElement('a');
			linkElement.href = normalizedUrl;
			linkElement.textContent = displayText;
			linkElement.target = '_blank';
			linkElement.rel = 'noopener noreferrer';
			linkElement.style.color = '#0066cc';
			linkElement.style.textDecoration = 'underline';
			editor.appendChild(linkElement);
		}
 
		syncEditorToForm();
 
		setLinkText('');
		setLinkUrl('');
		setSavedRange(null);
		setLinkPopoverPosition(null);
		setIsLinkPopoverOpen(false);
	}, [linkText, linkUrl, savedRange, syncEditorToForm]);
 
	// Close link popover when clicking outside / pressing Escape
	useEffect(() => {
		if (!isLinkPopoverOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (linkPopoverRef.current && !linkPopoverRef.current.contains(e.target as Node)) {
				setIsLinkPopoverOpen(false);
				setLinkText('');
				setLinkUrl('');
				setSavedRange(null);
				setLinkPopoverPosition(null);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsLinkPopoverOpen(false);
				setLinkText('');
				setLinkUrl('');
				setSavedRange(null);
				setLinkPopoverPosition(null);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isLinkPopoverOpen]);
 
	// Close dropdowns when clicking outside / pressing Escape
	useEffect(() => {
		if (!isFontDropdownOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
				setIsFontDropdownOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isFontDropdownOpen]);
 
	useEffect(() => {
		if (!isFontSizeDropdownOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				fontSizeDropdownRef.current &&
				!fontSizeDropdownRef.current.contains(e.target as Node)
			) {
				setIsFontSizeDropdownOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isFontSizeDropdownOpen]);
 
	useEffect(() => {
		if (!isColorPickerOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
				setIsColorPickerOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setIsColorPickerOpen(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isColorPickerOpen]);
 
	useEffect(() => {
		if (!isFillInsDropdownOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (fillInsDropdownRef.current && !fillInsDropdownRef.current.contains(e.target as Node)) {
				setIsFillInsDropdownOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setIsFillInsDropdownOpen(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isFillInsDropdownOpen]);
 
	const currentFont = form.watch('font') || DEFAULT_FONT;
	const currentFontLabel = (() => {
		if (currentFont === 'Arial') return 'Sans Serif';
		if (currentFont === 'serif') return 'Serif';
		if (currentFont === 'Courier New') return 'Fixed Width';
		if (currentFont === 'Arial Black') return 'Wide';
		if (currentFont === 'Arial Narrow') return 'Narrow';
		return currentFont;
	})();
 
	return (
		<div
			className={cn(
				'w-[95%] max-[480px]:w-[89.33vw] mx-auto mt-[9px] mb-[9px]',
				'bg-white border-[3px] border-[#0B5C0D] rounded-[8px] flex flex-col',
				'flex-1 min-h-0'
			)}
			style={{ overflow: 'visible' }}
			data-mini-manual-entry
		>
			{/* Header wrapper clips top corners cleanly while preserving overflow-visible for popovers */}
			<div className="bg-white overflow-hidden rounded-t-[5px]">
				{/* Subject (inside unified manual box) */}
				<div className="min-h-[30px] flex items-start px-3 py-2 bg-white cursor-text">
					<Textarea
						value={form.watch('subject') || ''}
						onChange={(e) => form.setValue('subject', e.target.value, { shouldDirty: true })}
						className={cn(
							'w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 !bg-transparent p-0 min-h-[18px] leading-[18px] resize-none overflow-hidden',
							'font-inter font-semibold text-[13px] placeholder:font-semibold placeholder:text-[13px] placeholder:opacity-100',
							'!text-black placeholder:text-black focus:placeholder:text-gray-400'
						)}
						style={{ maxHeight: '72px' }}
						placeholder="Subject"
						rows={1}
						onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
							const target = e.currentTarget;
							target.style.height = 'auto';
							target.style.height = Math.min(target.scrollHeight, 72) + 'px';
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter') e.preventDefault();
						}}
					/>
				</div>
				<div className="px-0 bg-white">
					<div className="w-full h-[2px] bg-[#AFAFAF]" />
				</div>
			</div>
 
			{/* Body */}
			<div className="flex-1 min-h-0 bg-white relative">
				<style>{`
					[data-mini-manual-body-editor] ul {
						list-style: disc;
						padding-left: 1.25rem;
						margin: 0.5rem 0;
					}
					[data-mini-manual-body-editor] ol {
						list-style: decimal;
						padding-left: 1.25rem;
						margin: 0.5rem 0;
					}
					[data-mini-manual-body-editor] li {
						margin: 0.125rem 0;
					}
					[data-mini-manual-body-editor] a {
						color: #0066cc;
						text-decoration: underline;
						cursor: pointer;
					}
					[data-mini-manual-body-editor] a:hover {
						color: #0052a3;
					}
				`}</style>
				<div
					ref={manualBodyEditorRef}
					contentEditable
					suppressContentEditableWarning
					data-mini-manual-body-editor
					className={cn(
						'absolute inset-0 resize-none border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none',
						'bg-white px-3 py-2 font-inter text-black',
						'overflow-y-auto'
					)}
					style={{
						fontFamily: form.watch('font') || 'Arial',
						fontSize: `${form.watch('fontSize') || DEFAULT_FONT_SIZE}px`,
						lineHeight: '1.4',
					}}
					onBlur={syncEditorToForm}
					onInput={syncEditorToForm}
					onClick={(e) => {
						const target = e.target as HTMLElement;
						if (target.tagName === 'A' && (e.ctrlKey || e.metaKey)) {
							e.preventDefault();
							const href = target.getAttribute('href');
							if (href) window.open(href, '_blank', 'noopener,noreferrer');
						}
					}}
				/>
 
				{/* Link popover */}
				{isLinkPopoverOpen && linkPopoverPosition && (
					<div
						ref={linkPopoverRef}
						className="absolute z-[9999] bg-[#E0E0E0] rounded-[8px] p-3 w-[260px]"
						style={{ top: linkPopoverPosition.top, left: linkPopoverPosition.left }}
					>
						<div className="flex items-center gap-2">
							<div className="flex-1 flex flex-col gap-2">
								<input
									type="text"
									value={linkText}
									onChange={(e) => setLinkText(e.target.value)}
									placeholder="Text"
									className="w-full px-2 py-1.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:border-gray-400 font-inter"
								/>
								<input
									type="text"
									value={linkUrl}
									onChange={(e) => setLinkUrl(e.target.value)}
									placeholder="Type or paste a link"
									className="w-full px-2 py-1.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:border-gray-400 font-inter"
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											applyLink();
										}
									}}
								/>
							</div>
							<button
								type="button"
								onClick={applyLink}
								disabled={!linkUrl.trim()}
								className={cn(
									'px-3 py-1.5 text-sm font-inter font-medium rounded transition-colors self-center',
									linkUrl.trim()
										? 'text-gray-700 hover:bg-gray-100 cursor-pointer'
										: 'text-gray-400 cursor-not-allowed'
								)}
							>
								Apply
							</button>
						</div>
					</div>
				)}
			</div>
 
			{/* Bottom toolbar */}
			<div className="flex justify-center py-[10px] flex-shrink-0 overflow-visible">
				<div ref={manualToolbarMeasureRef} className="w-full px-3">
					<div
						className="mx-auto"
						style={{
							width: MANUAL_TOOLBAR_BASE_WIDTH * manualToolbarScale,
							height: MANUAL_TOOLBAR_BASE_HEIGHT * manualToolbarScale,
						}}
					>
						<div
							style={{
								width: MANUAL_TOOLBAR_BASE_WIDTH,
								height: MANUAL_TOOLBAR_BASE_HEIGHT,
								transform: `scale(${manualToolbarScale})`,
								transformOrigin: 'top left',
							}}
						>
							<div
								className="w-[430px] h-[32px] rounded-[16px] bg-[#DDE6F5] relative flex items-center overflow-visible"
								style={{ backgroundColor: '#DDE6F5' }}
							>
								{/* Left section (Font) */}
								<div
									ref={fontDropdownRef}
									className="w-[109px] h-full flex items-center pl-[16px] pr-0 relative"
								>
									<button
										type="button"
										onMouseDown={(e) => e.preventDefault()}
										onClick={() => {
											// Close other dropdowns
											setIsFontSizeDropdownOpen(false);
											setIsColorPickerOpen(false);
											setIsFillInsDropdownOpen(false);
											setIsFontDropdownOpen(!isFontDropdownOpen);
										}}
										className={cn(
											'w-full h-full flex items-center',
											'bg-transparent border-0 shadow-none rounded-none',
											'px-0 py-0 relative cursor-pointer',
											'font-inter font-normal text-[14px] leading-none text-black',
											'hover:bg-transparent focus:bg-transparent focus:outline-none'
										)}
										style={{ fontFamily: form.watch('font') || DEFAULT_FONT }}
										aria-label="Font"
										aria-expanded={isFontDropdownOpen}
									>
										<div
											className="flex-1 flex items-center justify-center min-w-0 overflow-hidden pr-[24px] whitespace-nowrap text-center"
											style={{
												maskImage: 'linear-gradient(to right, black 50%, transparent 85%)',
												WebkitMaskImage:
													'linear-gradient(to right, black 50%, transparent 85%)',
											}}
										>
											<span>{currentFontLabel}</span>
										</div>
										<FontDropdownArrow className="!block pointer-events-none absolute right-[7px] bottom-[11px] !w-[8px] !h-[5px]" />
									</button>

									{/* Font dropdown */}
									{isFontDropdownOpen && (
										<div
											id="mini-font-dropdown-scroll-wrapper"
											className={cn(
												'absolute w-[119px] overflow-visible',
												'rounded-[8px] bg-[#E0E0E0]',
												'z-[9999]'
											)}
											style={{
												left: '0px',
												bottom: 'calc(100% + 8px)',
												height: '161px',
											}}
										>
											<style>{`
												#mini-font-dropdown-scroll-wrapper *::-webkit-scrollbar {
													display: none !important;
													width: 0 !important;
													height: 0 !important;
													background: transparent !important;
												}
												#mini-font-dropdown-scroll-wrapper * {
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
												{FONT_OPTIONS.map((font) => {
													const label =
														font === 'Arial'
															? 'Sans Serif'
															: font === 'serif'
																? 'Serif'
																: font === 'Courier New'
																	? 'Fixed Width'
																	: font === 'Arial Black'
																		? 'Wide'
																		: font === 'Arial Narrow'
																			? 'Narrow'
																			: font;
													const isSelected = (form.watch('font') || DEFAULT_FONT) === font;
													return (
														<button
															key={font}
															type="button"
															onClick={() => {
																form.setValue('font', font as DraftingFormValues['font'], {
																	shouldDirty: true,
																});
																setIsFontDropdownOpen(false);
															}}
															className={cn(
																'w-full px-2 py-1.5 text-left text-[12px] leading-none',
																'hover:bg-gray-300 cursor-pointer',
																isSelected && 'bg-gray-300/60'
															)}
															style={{ fontFamily: font }}
														>
															<span>{label}</span>
														</button>
													);
												})}
											</CustomScrollbar>
										</div>
									)}
								</div>

								{/* Divider (109px from left, 23px tall) */}
								<div
									aria-hidden="true"
									className="absolute left-[109px] top-1/2 -translate-y-1/2 w-px h-[23px] bg-black"
								/>

								{/* Font size */}
								<div
									ref={fontSizeDropdownRef}
									className="absolute left-[111px] top-0 bottom-0 w-[40px] flex items-center justify-center"
								>
									<button
										type="button"
										onMouseDown={(e) => e.preventDefault()}
										onClick={() => {
											// Close other dropdowns
											setIsFontDropdownOpen(false);
											setIsColorPickerOpen(false);
											setIsFillInsDropdownOpen(false);
											setIsFontSizeDropdownOpen(!isFontSizeDropdownOpen);
										}}
										className={cn(
											'w-full h-full flex items-center justify-center gap-[5px]',
											'bg-transparent border-0 shadow-none rounded-none',
											'px-0 py-0 cursor-pointer',
											'hover:bg-transparent focus:bg-transparent focus:outline-none'
										)}
										aria-label="Font Size"
										aria-expanded={isFontSizeDropdownOpen}
									>
										<FontSizeIcon width={12} height={12} />
										<FontDropdownArrow className="!block pointer-events-none !w-[8px] !h-[5px] relative top-[1px]" />
									</button>

									{isFontSizeDropdownOpen && (
										<div
											id="mini-font-size-dropdown-scroll-wrapper"
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
												#mini-font-size-dropdown-scroll-wrapper *::-webkit-scrollbar {
													display: none !important;
													width: 0 !important;
													height: 0 !important;
													background: transparent !important;
												}
												#mini-font-size-dropdown-scroll-wrapper * {
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
												{FONT_SIZE_OPTIONS.map((size) => {
													const currentSize = form.watch('fontSize') || DEFAULT_FONT_SIZE;
													const isSelected = currentSize === size;
													return (
														<button
															key={size}
															type="button"
															onClick={() => {
																form.setValue('fontSize', size, { shouldDirty: true });
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

								{/* Second divider */}
								<div
									aria-hidden="true"
									className="absolute left-[151px] top-1/2 -translate-y-1/2 w-px h-[23px] bg-black"
								/>

								{/* Bold */}
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => applyManualFormatting('bold')}
									className={cn(
										'absolute left-[159px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer transition-all rounded-[4px]',
										activeFormatting.bold ? 'bg-[#B8C8E0]' : 'hover:bg-[#C5D3E8]'
									)}
									aria-label="Bold"
								>
									<BoldIcon width={8} height={11} />
								</button>

								{/* Italic */}
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => applyManualFormatting('italic')}
									className={cn(
										'absolute left-[183px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer transition-all rounded-[4px]',
										activeFormatting.italic ? 'bg-[#B8C8E0]' : 'hover:bg-[#C5D3E8]'
									)}
									aria-label="Italic"
								>
									<ItalicIcon width={4} height={11} />
								</button>

								{/* Underline */}
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => applyManualFormatting('underline')}
									className={cn(
										'absolute left-[207px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer transition-all rounded-[4px]',
										activeFormatting.underline ? 'bg-[#B8C8E0]' : 'hover:bg-[#C5D3E8]'
									)}
									aria-label="Underline"
								>
									<UnderlineIcon width={11} height={14} />
								</button>

								{/* Bullets */}
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => applyManualFormatting('insertUnorderedList')}
									className={cn(
										'absolute left-[236px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer transition-all rounded-[4px]',
										activeFormatting.bulletList ? 'bg-[#B8C8E0]' : 'hover:bg-[#C5D3E8]'
									)}
									aria-label="Bullet list"
								>
									<BulletListIcon width={15} height={11} />
								</button>

								{/* Color picker */}
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
											setIsColorPickerOpen((v) => !v);
											setIsFillInsDropdownOpen(false);
										}}
										className={cn(
											'w-[24px] h-[24px] flex items-center justify-center cursor-pointer transition-all rounded-[4px]',
											isColorPickerOpen ? 'bg-[#B8C8E0]' : 'hover:bg-[#C5D3E8]'
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
																(manualSelectedBgColor ?? '').toLowerCase() ===
																color.toLowerCase();
															return (
																<button
																	key={`mini-bg-${color}`}
																	type="button"
																	onMouseDown={(e) => e.preventDefault()}
																	onClick={() => applyManualColor('hiliteColor', color)}
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
																(manualSelectedTextColor ?? '').toLowerCase() ===
																color.toLowerCase();
															return (
																<button
																	key={`mini-text-${color}`}
																	type="button"
																	onMouseDown={(e) => e.preventDefault()}
																	onClick={() => applyManualColor('foreColor', color)}
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

								{/* Link */}
								<button
									type="button"
									onMouseDown={(e) => e.preventDefault()}
									onClick={openLinkPopover}
									className={cn(
										'absolute left-[295px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer transition-all rounded-[4px]',
										isLinkPopoverOpen ? 'bg-[#B8C8E0]' : 'hover:bg-[#C5D3E8]'
									)}
									aria-label="Insert link"
								>
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
								</button>

								{/* Third divider (102px from right edge) */}
								<div
									aria-hidden="true"
									className="absolute right-[102px] top-1/2 -translate-y-1/2 w-px h-[23px] bg-black"
								/>

								{/* Fill-ins */}
								<div
									ref={fillInsDropdownRef}
									className="absolute right-[30px] top-0 h-full flex items-center"
								>
									<button
										type="button"
										onMouseDown={(e) => e.preventDefault()}
										onClick={() => {
											setIsFontDropdownOpen(false);
											setIsFontSizeDropdownOpen(false);
											setIsColorPickerOpen(false);
											setIsFillInsDropdownOpen(!isFillInsDropdownOpen);
										}}
										className="flex items-center cursor-pointer bg-transparent border-0 p-0"
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
											{FILL_IN_OPTIONS.map((option) => (
												<button
													key={option}
													type="button"
													onMouseDown={(e) => e.preventDefault()}
													onClick={() => insertFillIn(option)}
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
				</div>
			</div>
		</div>
	);
}


