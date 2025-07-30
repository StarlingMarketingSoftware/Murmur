import { FC } from 'react';
import { Input } from '@/components/ui/input';
import FeatureLockedButton from '@/components/atoms/FeatureLockedButton/FeatureLockedButton';
import { RESTRICTED_FEATURE_MESSAGES } from '@/constants';
import {
	RecipientAddressLockableInputProps,
	useRecipientAddressLockableInput,
} from './useRecipientAddressLockableInput';
import { FormLabel } from '@/components/ui/form';

export const RecipientAddressLockableInput: FC<RecipientAddressLockableInputProps> = (
	props
) => {
	const { email, displayEmail, label, className } =
		useRecipientAddressLockableInput(props);
	return (
		<div className={`relative ${className}`}>
			<FormLabel>{label}</FormLabel>
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
