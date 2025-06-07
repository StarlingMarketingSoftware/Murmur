import { FC } from 'react';
import { Input } from '@/components/ui/input';
import FeatureLockedButton from '@/components/atoms/FeatureLockedButton/FeatureLockedButton';
import { RESTRICTED_FEATURE_MESSAGES } from '@/constants';
import {
	RecipientAddressLockableInputProps,
	useRecipientAddressLockableInput,
} from './useRecipientAddressLockableInput';

export const RecipientAddressLockableInput: FC<RecipientAddressLockableInputProps> = (
	props
) => {
	const { email, displayEmail } = useRecipientAddressLockableInput(props);
	return (
		<div className="relative">
			<Input
				id="email"
				defaultValue={displayEmail ? email : '************'}
				readOnly
				className="col-span-3 !cursor-text !pointer-events-auto pr-[120px]"
			/>
			{!displayEmail && (
				<div className="absolute right-1 top-1/2 -translate-y-1/2">
					<FeatureLockedButton message={RESTRICTED_FEATURE_MESSAGES.viewEmails} />
				</div>
			)}
		</div>
	);
};
