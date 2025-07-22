'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { RichTextMenuBar } from './RichTextMenuBar';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import FontFamily from '@tiptap/extension-font-family';
import { FC, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { Node } from '@tiptap/core';
import TextStyle from '@tiptap/extension-text-style';
import { DEFAULT_FONT } from '@/constants/ui';

interface RichTextEditorProps {
	value: string;
	onChange?: (value: string) => void;
	isEdit?: boolean;
	className?: string;
	hideMenuBar?: boolean;
	disabled?: boolean;
	showPlaceholders?: boolean;
	placeholderOptions?: { value: string; label: string }[];
}

const Div = Node.create({
	name: 'div',
	group: 'block',
	content: 'block+',
	parseHTML() {
		return [{ tag: 'div' }];
	},
	renderHTML({ HTMLAttributes }) {
		return ['div', HTMLAttributes, 0];
	},
});

const RichTextEditor: FC<RichTextEditorProps> = ({
	value,
	onChange,
	isEdit = true,
	className,
	hideMenuBar = false,
	disabled = false,
	showPlaceholders = false,
	placeholderOptions,
}) => {
	const _isEdit = isEdit && !disabled;
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				bulletList: {
					HTMLAttributes: {
						class: 'list-disc pl-6',
					},
				},
				orderedList: {
					HTMLAttributes: {
						class: 'list-decimal pl-6',
					},
				},
			}),
			Highlight.configure({
				HTMLAttributes: {
					class: 'bg-yellow-200',
				},
			}),
			Underline,
			TextAlign.configure({
				types: ['heading', 'paragraph'],
				alignments: ['left', 'center', 'right'],
			}),
			FontFamily,
			TextStyle.configure({ mergeNestedSpanStyles: true }),
			Div,
		],
		onSelectionUpdate: ({ editor }) => {
			const { state } = editor;
			const { selection } = state;
			const { $head } = selection;

			if ($head.parent.content.size === 0) {
				let storedMarks = state.storedMarks || $head.marks();

				if (!storedMarks || storedMarks.length === 0) {
					let prevPos = $head.pos - 1;
					while (prevPos > 0) {
						const resolvedPos = state.doc.resolve(prevPos);
						const prevMarks = resolvedPos.marks();

						if (prevMarks.length > 0) {
							storedMarks = prevMarks;
							break;
						}
						prevPos--;
					}
				}

				if (storedMarks) {
					console.log('Restoring marks:', storedMarks);
					storedMarks.forEach((mark) => {
						editor.commands.setMark(mark.type.name, mark.attrs);
					});
				}
			}
		},
		editable: _isEdit,
		immediatelyRender: false,
		content: value ? value : '',
		editorProps: {
			attributes: {
				class: twMerge(
					'min-h-[200px] w-full rounded-md border border-gray-300 bg-background',
					'px-3 py-2 text-sm ',
					'placeholder:text-muted-foreground',
					'disabled:cursor-not-allowed disabled:opacity-50',
					disabled && [
						'cursor-not-allowed bg-light !text-light-foreground',
						'text-muted-foreground pointer-events-none',
						'border-muted-foreground',
					],
					className
				),
			},
		},
		onUpdate: ({ editor }) => {
			onChange?.(editor.getHTML());
		},
	});
	useEffect(() => {
		if (editor && value !== editor.getHTML()) {
			editor.commands.setContent(value);
		}
	}, [value, editor]);

	useEffect(() => {
		if (editor) {
			editor.setEditable(_isEdit);
		}
	}, [editor, _isEdit]);

	useEffect(() => {
		if (editor) {
			editor.commands.setFontFamily(DEFAULT_FONT);
		}
	}, [editor]);

	return (
		<div className="flex flex-col gap-2">
			{!hideMenuBar && (
				<RichTextMenuBar
					editor={editor}
					isEdit={_isEdit}
					showPlaceholders={showPlaceholders}
					placeholderOptions={placeholderOptions}
				/>
			)}
			<EditorContent editor={editor} />
		</div>
	);
};

export default RichTextEditor;
