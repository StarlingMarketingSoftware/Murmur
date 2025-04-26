import { Editor } from '@tiptap/react';
import React, { FC } from 'react';
import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Italic,
	List,
	ListOrdered,
	Strikethrough,
	Underline,
} from 'lucide-react';
import { Toggle } from '../../ui/toggle';

interface RichTextMenuBarProps {
	editor: Editor | null;
	isEdit?: boolean;
}
export const RichTextMenuBar: FC<RichTextMenuBarProps> = ({ editor, isEdit }) => {
	if (!editor) {
		return null;
	}
	const Options = [
		// {
		// 	icon: <Heading1 className="size-4" />,
		// 	onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
		// 	pressed: editor.isActive('heading', { level: 1 }),
		// },
		// {
		// 	icon: <Heading2 className="size-4" />,
		// 	onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
		// 	pressed: editor.isActive('heading', { level: 2 }),
		// },
		// {
		// 	icon: <Heading3 className="size-4" />,
		// 	onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
		// 	pressed: editor.isActive('heading', { level: 3 }),
		// },
		{
			icon: <Bold className="size-4" />,
			onClick: () => editor.chain().focus().toggleBold().run(),
			pressed: editor.isActive('bold'),
		},
		{
			icon: <Underline className="size-4" />,
			onClick: () => editor.chain().focus().toggleUnderline().run(),
			pressed: editor.isActive('underline'),
		},
		{
			icon: <Italic className="size-4" />,
			onClick: () => editor.chain().focus().toggleItalic().run(),
			pressed: editor.isActive('italic'),
		},
		{
			icon: <Strikethrough className="size-4" />,
			onClick: () => editor.chain().focus().toggleStrike().run(),
			pressed: editor.isActive('strike'),
		},
		{
			icon: <AlignLeft className="size-4" />,
			onClick: () => editor.chain().focus().setTextAlign('left').run(),
			pressed: editor.isActive({ textAlign: 'left' }),
		},
		{
			icon: <AlignCenter className="size-4" />,
			onClick: () => editor.chain().focus().setTextAlign('center').run(),
			pressed: editor.isActive({ textAlign: 'center' }),
		},
		{
			icon: <AlignRight className="size-4" />,
			onClick: () => editor.chain().focus().setTextAlign('right').run(),
			pressed: editor.isActive({ textAlign: 'right' }),
		},
		{
			icon: <List className="size-4" />,
			onClick: () => editor.chain().focus().toggleBulletList().run(),
			pressed: editor.isActive('bulletList'),
		},
		{
			icon: <ListOrdered className="size-4" />,
			onClick: () => editor.chain().focus().toggleOrderedList().run(),
			pressed: editor.isActive('orderedList'),
		},
		// {
		// 	icon: <Highlighter className="size-4" />,
		// 	onClick: () => editor.chain().focus().toggleHighlight().run(),
		// 	pressed: editor.isActive('highlight'),
		// },
	];

	return (
		<div className="border rounded-md p-1 mb-1 space-x-2 z-50">
			{Options.map((option, index) => (
				<Toggle
					disabled={!isEdit}
					key={index}
					pressed={option.pressed}
					onPressedChange={option.onClick}
				>
					{option.icon}
				</Toggle>
			))}
		</div>
	);
};
