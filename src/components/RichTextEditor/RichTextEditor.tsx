'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { RichTextMenuBar } from './RichTextMenuBar';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { FC, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

interface RichTextEditorProps {
	value: string;
	onChange: (value: string) => void;
	isEdit?: boolean;
	className?: string;
}

const RichTextEditor: FC<RichTextEditorProps> = ({
	value,
	onChange,
	isEdit = true,
	className,
}) => {
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
			TextAlign.configure({
				types: ['heading', 'paragraph'],
				alignments: ['left', 'center', 'right'],
			}),
		],
		editable: isEdit,
		immediatelyRender: false,
		content: value ? value : '',
		editorProps: {
			attributes: {
				class: twMerge(
					' min-h-[200px]  w-full rounded-md border border-input bg-input/30',
					' px-3 py-2 text-sm ring-offset-background ',
					'placeholder:text-muted-foreground',
					' focus-visible:outline-none focus-visible:ring-2 ',
					'focus-visible:ring-ring focus-visible:ring-offset-2 ',
					'disabled:cursor-not-allowed disabled:opacity-50',
					className
				),
			},
		},
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
	});

	useEffect(() => {
		if (editor && value !== editor.getHTML()) {
			editor.commands.setContent(value);
		}
	}, [value, editor]);

	useEffect(() => {
		if (editor) {
			editor.setEditable(isEdit);
		}
	}, [editor, isEdit]);

	return (
		<div className="flex flex-col gap-2">
			<RichTextMenuBar editor={editor} isEdit={isEdit} />
			<EditorContent editor={editor} />
		</div>
	);
};

export default RichTextEditor;
