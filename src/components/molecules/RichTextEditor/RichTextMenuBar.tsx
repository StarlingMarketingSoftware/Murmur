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
	TypeIcon,
	Underline,
} from 'lucide-react';
import { Toggle } from '../../ui/toggle';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface RichTextMenuBarProps {
	editor: Editor | null;
	isEdit?: boolean;
}

const fontOptions = ['Times New Roman', 'Arial', 'Calibri', 'Georgia', 'Courier New'];

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
	];

	return (
		<div className="border rounded-md p-1 mb-1 space-x-2 z-50 flex">
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
			<Select
				onValueChange={(font) => editor.chain().focus().setFontFamily(font).run()}
				defaultValue={fontOptions[0]}
				value={editor.getAttributes('textStyle').fontFamily}
				disabled={!isEdit}
			>
				<SelectTrigger>
					<TypeIcon className="size-4 mr-2" />
					<SelectValue placeholder="Select font" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectLabel>Fonts</SelectLabel>
						{fontOptions.map((font) => (
							<SelectItem key={font} value={font} style={{ fontFamily: font }}>
								{font}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
};
