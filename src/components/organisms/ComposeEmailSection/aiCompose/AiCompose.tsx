import { Button } from '@/components/ui/button';
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
	Form,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { SaveIcon, WandSparklesIcon } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { FONT_OPTIONS } from '@/constants';
import { FC } from 'react';
import useAiCompose, { AiComposeProps } from './useAiCompose';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ManageSignaturesDialog } from '../../_dialogs/ManageSignaturesDialog/ManageSignaturesDialog';
import ProgressIndicator from '../../../molecules/ProgressIndicator/ProgressIndicator';
import { ConfirmDialog } from '../../_dialogs/ConfirmDialog/ConfirmDialog';
import { ellipsesText } from '@/utils';

const AiCompose: FC<AiComposeProps> = (props) => {
	const {
		form,
		isAiSubject,
		setIsAiSubject,
		handleFormAction,
		isTest,
		isPendingGeneration,
		handleSavePrompt,
		isPendingSavePrompt,
		aiDraftCredits,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
		selectedSignature,
		generationProgress,
		setGenerationProgress,
		cancelGeneration,
		campaign,
		contacts,
	} = useAiCompose(props);

	const {
		trigger,
		formState: { isDirty },
	} = form;

	return <></>;
};

export default AiCompose;
