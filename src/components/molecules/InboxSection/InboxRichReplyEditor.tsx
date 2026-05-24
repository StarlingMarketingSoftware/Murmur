'use client';

import {
	CSSProperties,
	FC,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import type { Font } from '@/types';
import { DEFAULT_FONT } from '@/constants/ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils';
import {
	DEFAULT_MANUAL_EDITOR_FONT_SIZE,
	MANUAL_TOOLBAR_BASE_WIDTH,
	MANUAL_TOOLBAR_COMPACT_WIDTH,
	ManualTextEditorColorCommand,
	ManualTextEditorCommand,
	ManualTextEditorFillIn,
	ManualTextEditorFormatting,
	ManualTextEditorToolbar,
} from '@/components/molecules/HybridPromptInput/ManualTextEditorToolbar';

const EMPTY_FORMATTING: ManualTextEditorFormatting = {
	bold: false,
	italic: false,
	underline: false,
	bulletList: false,
};

const decodeBasicHtmlEntities = (value: string) =>
	value
		.replace(/&nbsp;/gi, ' ')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/gi, "'")
		.replace(/&amp;/gi, '&');

export const getRichTextPlainText = (html: string): string => {
	return decodeBasicHtmlEntities(
		html
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/(div|p|li)>/gi, '\n')
			.replace(/<[^>]*>/g, '')
	)
		.replace(/\u00a0/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
};

export const isRichTextMessageEmpty = (html: string): boolean =>
	getRichTextPlainText(html).length === 0;

type InboxRichReplyEditorProps = {
	value: string;
	onChange: (html: string) => void;
	onSend: (html: string) => void;
	isSending: boolean;
	isMobile?: boolean;
	variant: 'floating' | 'stacked' | 'pill';
	containerStyle?: CSSProperties;
	containerClassName?: string;
};

const focusEditorAtEnd = (editor: HTMLDivElement) => {
	editor.focus();
	try {
		const selection = window.getSelection();
		const range = document.createRange();
		range.selectNodeContents(editor);
		range.collapse(false);
		selection?.removeAllRanges();
		selection?.addRange(range);
	} catch {
		// Best effort only; formatting still works when the browser owns selection state.
	}
};

const insertHtmlAtEditorSelection = (editor: HTMLDivElement, html: string) => {
	editor.focus();

	const selection = window.getSelection();

	if (
		!selection ||
		selection.rangeCount === 0 ||
		!editor.contains(selection.anchorNode)
	) {
		const range = document.createRange();
		range.selectNodeContents(editor);
		range.collapse(false);
		selection?.removeAllRanges();
		selection?.addRange(range);
	}

	document.execCommand('insertHTML', false, html);
};

const createFillInHtml = (fillInType: ManualTextEditorFillIn) =>
	`<span contenteditable="false" data-fill-in="${fillInType}" style="display: inline-block; background-color: #E8EFFF; color: #000000; padding: 2px 8px; border-radius: 6px; border: 1px solid #000000; font-size: 12px; font-family: Inter, sans-serif; font-weight: 500; margin: 0 2px; user-select: all; vertical-align: baseline;">${fillInType}</span>`;

export const InboxRichReplyEditor: FC<InboxRichReplyEditorProps> = ({
	value,
	onChange,
	onSend,
	isSending,
	isMobile = false,
	variant,
	containerStyle,
	containerClassName,
}) => {
	const editorRef = useRef<HTMLDivElement>(null);
	const editorShellRef = useRef<HTMLDivElement>(null);
	const toolbarMeasureRef = useRef<HTMLDivElement>(null);
	const linkPopoverRef = useRef<HTMLDivElement>(null);
	const toolbarId = useId().replace(/[^a-zA-Z0-9_-]/g, '-');
	const [font, setFont] = useState<Font>(DEFAULT_FONT);
	const [fontSize, setFontSize] = useState(DEFAULT_MANUAL_EDITOR_FONT_SIZE);
	const [activeFormatting, setActiveFormatting] = useState(EMPTY_FORMATTING);
	const [selectedTextColor, setSelectedTextColor] = useState<string | null>(null);
	const [selectedBgColor, setSelectedBgColor] = useState<string | null>(null);
	const [toolbarScale, setToolbarScale] = useState(1);
	const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
	const [linkText, setLinkText] = useState('');
	const [linkUrl, setLinkUrl] = useState('');
	const [savedRange, setSavedRange] = useState<Range | null>(null);
	const [linkPopoverPosition, setLinkPopoverPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);

	useLayoutEffect(() => {
		const el = toolbarMeasureRef.current;
		if (!el) return;

		const update = () => {
			// The floating composer reserves a fixed-width slot for the compact
			// (no fill-ins) toolbar, so it always renders at full size and stays
			// the same height as the Reply button. Don't measure here: the campaign
			// map view scales its UI with `transform: scale(...)`, and
			// getBoundingClientRect reports post-transform pixels — measuring would
			// shrink the toolbar relative to the (logically sized) Reply button.
			if (variant === 'floating') {
				setToolbarScale(1);
				return;
			}

			const available = el.getBoundingClientRect().width;
			const next = Math.min(
				1,
				Math.max(0.56, (available - 2) / MANUAL_TOOLBAR_BASE_WIDTH)
			);
			setToolbarScale(Number.isFinite(next) ? next : 1);
		};

		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		window.addEventListener('resize', update);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', update);
		};
	}, [isMobile, variant]);

	useEffect(() => {
		const editor = editorRef.current;
		if (!editor) return;
		if (value === '') {
			editor.innerHTML = '';
			return;
		}
		if (document.activeElement !== editor && editor.innerHTML !== value) {
			editor.innerHTML = value;
		}
	}, [value]);

	const syncEditorToValue = useCallback(() => {
		const editor = editorRef.current;
		if (!editor) return '';
		const html = isRichTextMessageEmpty(editor.innerHTML) ? '' : editor.innerHTML;
		onChange(html);
		return html;
	}, [onChange]);

	const updateActiveFormatting = useCallback(() => {
		const editor = editorRef.current;
		const selection = window.getSelection();
		if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) {
			setActiveFormatting(EMPTY_FORMATTING);
			return;
		}

		setActiveFormatting({
			bold: document.queryCommandState('bold'),
			italic: document.queryCommandState('italic'),
			underline: document.queryCommandState('underline'),
			bulletList: document.queryCommandState('insertUnorderedList'),
		});
	}, []);

	useEffect(() => {
		const handleSelectionChange = () => updateActiveFormatting();
		document.addEventListener('selectionchange', handleSelectionChange);
		return () => document.removeEventListener('selectionchange', handleSelectionChange);
	}, [updateActiveFormatting]);

	const applyFormatting = useCallback(
		(command: ManualTextEditorCommand) => {
			const editor = editorRef.current;
			if (!editor) return;
			editor.focus();
			document.execCommand(command, false);
			updateActiveFormatting();
			syncEditorToValue();
		},
		[syncEditorToValue, updateActiveFormatting]
	);

	const applyColor = useCallback(
		(command: ManualTextEditorColorCommand, color: string) => {
			const editor = editorRef.current;
			if (!editor) return;

			editor.focus();
			try {
				document.execCommand('styleWithCSS', false, 'true');
			} catch {
				// Unsupported in some browsers; execCommand still falls back to tags.
			}

			if (command === 'hiliteColor') {
				setSelectedBgColor(color);
				const ok = document.execCommand('hiliteColor', false, color);
				if (!ok) document.execCommand('backColor', false, color);
			} else {
				setSelectedTextColor(color);
				document.execCommand('foreColor', false, color);
			}

			updateActiveFormatting();
			syncEditorToValue();
		},
		[syncEditorToValue, updateActiveFormatting]
	);

	const insertFillIn = useCallback(
		(fillInType: ManualTextEditorFillIn) => {
			const editor = editorRef.current;
			if (!editor) return;
			insertHtmlAtEditorSelection(editor, createFillInHtml(fillInType));
			syncEditorToValue();
		},
		[syncEditorToValue]
	);

	const closeLinkPopover = useCallback(() => {
		setIsLinkPopoverOpen(false);
		setLinkText('');
		setLinkUrl('');
		setSavedRange(null);
		setLinkPopoverPosition(null);
	}, []);

	const openLinkPopover = useCallback(() => {
		const editor = editorRef.current;
		const shell = editorShellRef.current;
		if (!editor || !shell) return;

		editor.focus();
		let selection = window.getSelection();
		let range: Range;

		if (
			!selection ||
			selection.rangeCount === 0 ||
			!editor.contains(selection.anchorNode)
		) {
			range = document.createRange();
			range.selectNodeContents(editor);
			range.collapse(false);
			selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
		} else {
			range = selection.getRangeAt(0);
		}

		setSavedRange(range.cloneRange());
		setLinkText(selection?.toString() || '');
		setLinkUrl('');

		const rect = range.getBoundingClientRect();
		const shellRect = shell.getBoundingClientRect();
		const popoverTop = rect.height > 0 ? rect.bottom - shellRect.top + 8 : 40;
		const popoverLeft =
			rect.width > 0 || rect.left > 0 ? Math.max(0, rect.left - shellRect.left) : 0;
		setLinkPopoverPosition({
			top: Math.max(8, popoverTop),
			left: Math.min(popoverLeft, Math.max(0, shellRect.width - 288)),
		});
		setIsLinkPopoverOpen(true);
	}, []);

	const applyLink = useCallback(() => {
		const editor = editorRef.current;
		if (!editor || !linkUrl.trim()) return;

		const normalizedUrl =
			linkUrl.startsWith('http://') || linkUrl.startsWith('https://')
				? linkUrl
				: `https://${linkUrl}`;
		const displayText = linkText.trim() || normalizedUrl;
		editor.focus();

		if (savedRange) {
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(savedRange);
		}

		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			if (selection.toString()) range.deleteContents();

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

		syncEditorToValue();
		closeLinkPopover();
	}, [closeLinkPopover, linkText, linkUrl, savedRange, syncEditorToValue]);

	useEffect(() => {
		if (!isLinkPopoverOpen) return;

		const handleMouseDown = (e: MouseEvent) => {
			if (linkPopoverRef.current && !linkPopoverRef.current.contains(e.target as Node)) {
				closeLinkPopover();
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeLinkPopover();
		};

		document.addEventListener('mousedown', handleMouseDown);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleMouseDown);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [closeLinkPopover, isLinkPopoverOpen]);

	const buildSendHtml = useCallback(() => {
		const html = syncEditorToValue();
		if (isRichTextMessageEmpty(html)) return '';
		return `<div><div style="font-family: ${font}; font-size: ${fontSize}px; line-height: 1.4;">${html}</div></div>`;
	}, [font, fontSize, syncEditorToValue]);

	const handleSend = () => {
		const html = buildSendHtml();
		if (!html) return;
		onSend(html);
	};

	const editor = (
		<div
			ref={editorShellRef}
			className="relative h-full min-h-0 overflow-visible bg-transparent"
		>
			<style>{`
				[data-inbox-rich-reply-editor] ul {
					list-style: disc;
					padding-left: 1.25rem;
					margin: 0.5rem 0;
				}
				[data-inbox-rich-reply-editor] ol {
					list-style: decimal;
					padding-left: 1.25rem;
					margin: 0.5rem 0;
				}
				[data-inbox-rich-reply-editor] li {
					margin: 0.125rem 0;
				}
				[data-inbox-rich-reply-editor] a {
					color: #0066cc;
					text-decoration: underline;
					cursor: pointer;
				}
			`}</style>
			<div
				ref={editorRef}
				contentEditable={!isSending}
				suppressContentEditableWarning
				role="textbox"
				aria-multiline="true"
				aria-disabled={isSending}
				data-inbox-rich-reply-editor
				className={cn(
					'absolute inset-0 resize-none border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none',
					'bg-white font-inter text-black overflow-y-auto',
					isSending && 'pointer-events-none opacity-70'
				)}
				style={{
					fontFamily: font,
					fontSize: `${fontSize}px`,
					lineHeight: '1.4',
					borderTopLeftRadius: variant === 'floating' ? '6.877px' : '8px',
					borderTopRightRadius: variant === 'floating' ? '6.877px' : '8px',
					padding:
						variant === 'floating' ? '16px 18px 0 18px' : isMobile ? '12px' : '16px',
				}}
				onInput={syncEditorToValue}
				onBlur={syncEditorToValue}
				onClick={(e) => {
					const target = e.target as HTMLElement;
					if (target.tagName === 'A' && (e.ctrlKey || e.metaKey)) {
						e.preventDefault();
						const href = target.getAttribute('href');
						if (href) window.open(href, '_blank', 'noopener,noreferrer');
					}
				}}
				onFocus={() => {
					if (!editorRef.current?.innerHTML && value)
						editorRef.current!.innerHTML = value;
				}}
			/>

			{isLinkPopoverOpen && linkPopoverPosition && (
				<div
					ref={linkPopoverRef}
					className="absolute z-[9999] bg-[#E0E0E0] rounded-[8px] p-3 w-[280px]"
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
	);

	const toolbar = (
		<ManualTextEditorToolbar
			idPrefix={`inbox-reply-${variant}-${toolbarId}`}
			font={font}
			fontSize={fontSize}
			activeFormatting={activeFormatting}
			selectedTextColor={selectedTextColor}
			selectedBgColor={selectedBgColor}
			isLinkActive={isLinkPopoverOpen}
			hideFillIns={variant === 'floating'}
			scale={toolbarScale}
			onFontChange={(nextFont) => {
				setFont(nextFont);
				if (editorRef.current && document.activeElement !== editorRef.current) {
					focusEditorAtEnd(editorRef.current);
				}
			}}
			onFontSizeChange={(nextSize) => {
				setFontSize(nextSize);
				if (editorRef.current && document.activeElement !== editorRef.current) {
					focusEditorAtEnd(editorRef.current);
				}
			}}
			onFormat={applyFormatting}
			onColor={applyColor}
			onOpenLink={openLinkPopover}
			onInsertFillIn={insertFillIn}
		/>
	);

	const isSendDisabled = isSending || isRichTextMessageEmpty(value);

	// Compact "text message" composer used in the messenger (3+ message) thread view:
	// a single-line white pill with a small solid-blue Reply button.
	const pillReplyButtonStyle: CSSProperties = {
		display: 'flex',
		height: '31.13px',
		padding: '0 15.364px',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: '20.429px',
		border: '1.466px solid #000',
		background: '#A0C6FF',
		boxSizing: 'border-box',
		boxShadow: '0 0.733px 1.466px 0 rgba(0, 0, 0, 0.05)',
		fontFamily: 'Inter, sans-serif',
		fontSize: '13px',
		fontWeight: 700,
		lineHeight: 1,
	};
	const pillEditorLineHeight = fontSize * 1.2;
	const pillEditorVerticalPadding = Math.max(
		0,
		(36.967 - 1.672 * 2 - pillEditorLineHeight) / 2
	);

	if (variant === 'pill') {
		return (
			<div
				className={containerClassName}
				style={{ ...containerStyle, overflow: 'visible' }}
			>
				<div className="flex h-full w-full items-center">
					<div
						className="flex w-full items-center"
						style={{
							height: '36.967px',
							borderRadius: '35.021px',
							border: '1.672px solid #000',
							background: '#FFF',
							padding: '0 3.5px 0 18px',
							boxSizing: 'border-box',
							gap: '8px',
							overflow: 'hidden',
						}}
					>
						<div
							ref={editorRef}
							contentEditable={!isSending}
							suppressContentEditableWarning
							role="textbox"
							aria-multiline="false"
							aria-disabled={isSending}
							data-inbox-rich-reply-editor
							className={cn(
								'min-w-0 flex-1 overflow-x-auto overflow-y-hidden whitespace-nowrap',
								'font-inter text-black outline-none',
								isSending && 'pointer-events-none opacity-70'
							)}
							style={{
								height: '100%',
								padding: `${pillEditorVerticalPadding}px 0`,
								boxSizing: 'border-box',
								fontFamily: font,
								fontSize: `${fontSize}px`,
								lineHeight: `${pillEditorLineHeight}px`,
							}}
							onInput={syncEditorToValue}
							onBlur={syncEditorToValue}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									handleSend();
								}
							}}
						/>
						<Button
							onClick={handleSend}
							disabled={isSendDisabled}
							className="shrink-0 text-black disabled:cursor-not-allowed disabled:opacity-50"
							style={pillReplyButtonStyle}
						>
							Reply
						</Button>
					</div>
				</div>
			</div>
		);
	}

	const replyButtonStyle: CSSProperties = {
		display: 'flex',
		height: '32px',
		padding: '9.013px 0 6.987px 0',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: '21px',
		border: '1.507px solid #000',
		background: 'linear-gradient(90deg, #A0C6FF 0%, #61A0FF 100%)',
		boxShadow: '0 0.754px 1.507px 0 rgba(0, 0, 0, 0.05)',
		fontFamily: 'Inter, sans-serif',
		fontSize: '14px',
		fontWeight: 700,
	};

	if (variant === 'floating') {
		return (
			<div
				className={containerClassName}
				style={{ ...containerStyle, overflow: 'visible' }}
			>
				<div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '104px' }}>
					{editor}
				</div>
				<div
					ref={toolbarMeasureRef}
					className="absolute overflow-visible"
					style={{
						left: '8px',
						bottom: '13px',
						right: '144px',
						maxWidth: `${MANUAL_TOOLBAR_COMPACT_WIDTH}px`,
					}}
				>
					{toolbar}
				</div>
				<Button
					onClick={handleSend}
					disabled={isSendDisabled}
					className="absolute text-black disabled:cursor-not-allowed disabled:opacity-50"
					style={{
						...replyButtonStyle,
						right: '8px',
						bottom: '12px',
						width: '123.63px',
					}}
				>
					{isSending ? 'Sending...' : 'Reply'}
				</Button>
			</div>
		);
	}

	return (
		<div
			className={containerClassName}
			style={{ ...containerStyle, overflow: 'visible' }}
		>
			<div style={{ height: isMobile ? '96px' : '121px' }}>{editor}</div>
			<div
				className={cn(
					'flex gap-2 overflow-visible',
					isMobile ? 'flex-col' : 'items-center'
				)}
				style={{ borderTop: '3px solid #000000', padding: isMobile ? '8px' : '8px 10px' }}
			>
				<div
					ref={toolbarMeasureRef}
					className={cn(
						'min-w-0 flex-1 overflow-visible',
						isMobile ? 'flex justify-center' : ''
					)}
				>
					{toolbar}
				</div>
				<Button
					onClick={handleSend}
					disabled={isSendDisabled}
					className={cn(
						'text-black disabled:cursor-not-allowed disabled:opacity-50',
						isMobile ? 'w-full' : 'shrink-0'
					)}
					style={{
						...replyButtonStyle,
						width: isMobile ? undefined : '123.63px',
					}}
				>
					{isSending ? 'Sending...' : 'Reply'}
				</Button>
			</div>
		</div>
	);
};
