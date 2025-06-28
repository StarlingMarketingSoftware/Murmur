import { useFormContext } from 'react-hook-form';

export const useHybridPromptInput = () => {
	const form = useFormContext();

	return { form };
};
