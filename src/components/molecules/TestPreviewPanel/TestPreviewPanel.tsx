import { X } from 'lucide-react';
import { Dispatch, FC, SetStateAction } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';

interface TestPreviewPanelProps {
	setShowTestPreview: Dispatch<SetStateAction<boolean>>;
	testMessage: string;
}

export const TestPreviewPanel: FC<TestPreviewPanelProps> = ({
	setShowTestPreview,
	testMessage,
}) => {
	const form = useFormContext();
	return (
		<div className="w-1/2 flex flex-col">
			<div className="flex-1 flex flex-col p-3">
				<div className="flex-1 border-2 border-black rounded-lg bg-background flex flex-col overflow-hidden mb-[13px]">
					<div className="relative p-4">
						<h3 className="text-sm font-medium font-inter text-center">Test Prompt</h3>
						<Button
							type="button"
							variant="icon"
							onClick={() => setShowTestPreview(false)}
							className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
						>
							<X className="h-5 w-5 text-destructive-dark" />
						</Button>
					</div>

					<div className="flex-1 p-6 overflow-y-auto bg-gray-50">
						<div
							dangerouslySetInnerHTML={{ __html: testMessage }}
							className="max-w-none leading-[1.6] text-[14px]"
							style={{
								fontFamily: form.watch('font') || 'Arial',
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
