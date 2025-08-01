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
import { DEFAULT_FONT, FONT_OPTIONS } from '@/constants/ui';

interface RichTextMenuBarProps {
	editor: Editor | null;
	isEdit?: boolean;
	showPlaceholders?: boolean;
	placeholderOptions?: { value: string; label: string }[];
}

export const RichTextMenuBar: FC<RichTextMenuBarProps> = ({
	editor,
	isEdit,
	showPlaceholders = false,
	placeholderOptions,
}) => {
	const handlePlaceholderInsert = (placeholder: string) => {
		if (editor) {
			editor.chain().focus().insertContent(`{{${placeholder}}}`).run();
		}
	};

	if (!editor) {
		return null;
	}

	const Options = [
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
		<div className="border rounded-md p-1 mb-1 space-x-2 space-y-0.5 z-40 flex flex-wrap">
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
				defaultValue={DEFAULT_FONT}
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
						{FONT_OPTIONS.map((font) => (
							<SelectItem key={font} value={font} style={{ fontFamily: font }}>
								{font}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			{showPlaceholders && placeholderOptions && (
				<Select value="" onValueChange={handlePlaceholderInsert} disabled={!isEdit}>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder="Placeholders" />
					</SelectTrigger>
					<SelectContent
						onCloseAutoFocus={(e) => {
							e.preventDefault();
							if (editor) {
								editor.commands.focus();
							}
						}}
					>
						<SelectGroup>
							<SelectLabel>Insert Placeholders</SelectLabel>
							{placeholderOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			)}
		</div>
	);
};
