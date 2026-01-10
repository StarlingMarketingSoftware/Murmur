'use client';

import React, { type CSSProperties, type FC, useMemo } from 'react';
import UndoIcon from '@/components/atoms/_svg/UndoIcon';
import UpscaleIcon from '@/components/atoms/_svg/UpscaleIcon';
import { cn } from '@/utils';

export interface PromptSuggestionsBoxProps {
	/** Header label (defaults to "Suggestion"). */
	title?: string;
	/** Layout preset. `landing` is shorter and fits 338x290. */
	variant?: 'default' | 'landing';
	promptQualityScore?: number | null;
	promptQualityLabel?: string | null;
	suggestions?: string[];
	isUpscalingPrompt?: boolean;
	hasPreviousPrompt?: boolean;
	onUndoUpscalePrompt?: () => void;
	onUpscalePrompt?: () => void | Promise<void>;
	className?: string;
	style?: CSSProperties;
}

export const PromptSuggestionsBox: FC<PromptSuggestionsBoxProps> = ({
	title = 'Suggestion',
	variant = 'default',
	promptQualityScore,
	promptQualityLabel,
	suggestions = [],
	isUpscalingPrompt,
	hasPreviousPrompt,
	onUndoUpscalePrompt,
	onUpscalePrompt,
	className,
	style,
}) => {
	const clampedPromptScore = useMemo(() => {
		return typeof promptQualityScore === 'number'
			? Math.max(70, Math.min(98, Math.round(promptQualityScore)))
			: null;
	}, [promptQualityScore]);

	const promptScoreFillPercent = clampedPromptScore == null ? 0 : clampedPromptScore;

	const promptScoreDisplayLabel = useMemo(() => {
		if (clampedPromptScore == null) return '';
		const derivedLabel =
			promptQualityLabel ||
			(clampedPromptScore >= 97
				? 'Exceptional'
				: clampedPromptScore >= 91
					? 'Excellent'
					: clampedPromptScore >= 83
						? 'Great'
						: clampedPromptScore >= 75
							? 'Good'
							: 'Keep Going');
		return `${clampedPromptScore} - ${derivedLabel}`;
	}, [clampedPromptScore, promptQualityLabel]);

	const suggestionText1 = suggestions?.[0] || '';
	const suggestionText2 = suggestions?.[1] || '';
	const suggestionText3 = suggestions?.[2] || '';

	const layout = useMemo(() => {
		if (variant === 'landing') {
			return {
				containerWidth: 338,
				containerHeight: 290,
				// Packed tighter so all 3 suggestion rows fit inside 290px height
				customInstructionsLabelTop: 100,
				suggestion1Top: 124,
				suggestion2Top: 178,
				suggestion3Top: 232,
			};
		}

		return {
			containerWidth: 330,
			containerHeight: 347,
			customInstructionsLabelTop: 139,
			suggestion1Top: 176,
			suggestion2Top: 230,
			suggestion3Top: 284,
		};
	}, [variant]);

	return (
		<div
			className={cn('relative', className)}
			style={{
				width: `${layout.containerWidth}px`,
				height: `${layout.containerHeight}px`,
				backgroundColor: '#D6EEEF',
				border: '3px solid #000000',
				borderRadius: '7px',
				position: 'relative',
				boxSizing: 'border-box',
				...style,
			}}
		>
			<div
				style={{
					height: '28px',
					display: 'flex',
					alignItems: 'center',
					paddingLeft: '9px',
				}}
			>
				<span className="font-inter font-bold text-[12px] leading-none text-black">
					{title}
				</span>
			</div>

			{/* Score bar */}
			<div
				style={{
					position: 'absolute',
					top: '26px',
					left: '50%',
					transform: 'translateX(-50%)',
					width: '322px',
					height: '25px',
					backgroundColor: '#FFFFFF',
					border: '2px solid #000000',
					borderRadius: '5px',
					boxSizing: 'border-box',
					display: 'flex',
					alignItems: 'center',
					gap: '10px',
					paddingLeft: '8px',
					paddingRight: '8px',
				}}
			>
				<div
					style={{
						width: '223px',
						height: '12px',
						backgroundColor: '#FFFFFF',
						border: '2px solid #000000',
						borderRadius: '8px',
						overflow: 'hidden',
						flexShrink: 0,
						boxSizing: 'border-box',
						position: 'relative',
					}}
				>
					<div
						style={{
							height: '100%',
							borderRadius: '999px',
							backgroundColor: '#36B24A',
							width: `${promptScoreFillPercent}%`,
							maxWidth: '100%',
							transition: 'width 250ms ease-out',
						}}
					/>
				</div>
				<div
					style={{
						fontFamily: 'Inter, system-ui, sans-serif',
						fontWeight: 700,
						fontSize: '12px',
						lineHeight: '14px',
						color: '#000000',
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						flex: 1,
						minWidth: 0,
						textAlign: 'right',
					}}
				>
					{promptScoreDisplayLabel}
				</div>
			</div>

			{/* Undo button */}
			<div
				onClick={() => {
					if (hasPreviousPrompt) onUndoUpscalePrompt?.();
				}}
				style={{
					position: 'absolute',
					top: '61px',
					left: '6px',
					width: '39px',
					height: '32px',
					backgroundColor: '#C2C2C2',
					border: '2px solid #000000',
					borderRadius: '8px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					cursor: hasPreviousPrompt ? 'pointer' : 'not-allowed',
					boxSizing: 'border-box',
				}}
				role="button"
				aria-label="Undo Upscale"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key !== 'Enter' && e.key !== ' ') return;
					e.preventDefault();
					if (hasPreviousPrompt) onUndoUpscalePrompt?.();
				}}
			>
				{clampedPromptScore != null && <UndoIcon width="24" height="24" />}
			</div>

			{/* Upscale */}
			<div
				onClick={() => {
					if (isUpscalingPrompt) return;
					void onUpscalePrompt?.();
				}}
				style={{
					position: 'absolute',
					top: '61px',
					left: '50px',
					width: '233px',
					height: '32px',
					backgroundColor: '#D7F0FF',
					border: '2px solid #000000',
					borderRadius: '8px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					paddingLeft: '10px',
					paddingRight: '10px',
					cursor: isUpscalingPrompt ? 'wait' : 'pointer',
					boxSizing: 'border-box',
				}}
				role="button"
				aria-label="Upscale Instructions"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key !== 'Enter' && e.key !== ' ') return;
					e.preventDefault();
					if (isUpscalingPrompt) return;
					void onUpscalePrompt?.();
				}}
			>
				{(clampedPromptScore != null || isUpscalingPrompt) && (
					<>
						<span
							style={{
								fontFamily: 'Inter, system-ui, sans-serif',
								fontSize: '13px',
								fontWeight: 500,
								color: '#000000',
								lineHeight: '1',
							}}
						>
							{isUpscalingPrompt ? 'Upscaling...' : 'Upscale Instructions'}
						</span>
						<div style={{ flexShrink: 0 }}>
							<UpscaleIcon width="20" height="20" />
						</div>
					</>
				)}
			</div>

			<div
				style={{
					position: 'absolute',
					top: `${layout.customInstructionsLabelTop}px`,
					left: '8px',
					fontFamily: 'Inter, system-ui, sans-serif',
					fontWeight: 500,
					fontSize: variant === 'landing' ? '15px' : '17px',
					lineHeight: variant === 'landing' ? '18px' : '20px',
					color: '#000000',
				}}
			>
				Custom Instructions
			</div>

			{/* Suggestion 1 */}
			<div
				style={{
					position: 'absolute',
					top: `${layout.suggestion1Top}px`,
					left: '50%',
					transform: 'translateX(-50%)',
					width: '315px',
					height: '46px',
					backgroundColor: '#A6DDE0',
					border: '2px solid #000000',
					borderRadius: '8px',
					overflow: 'hidden',
					boxSizing: 'border-box',
				}}
			>
				<div
					className="absolute font-inter font-bold tabular-nums"
					style={{
						top: '4.5px',
						left: '5px',
						fontSize: '11.5px',
						color: '#000000',
					}}
				>
					[1]
				</div>
				<div
					style={{
						position: 'absolute',
						top: '0',
						bottom: '0',
						margin: 'auto',
						right: '6px',
						width: '260px',
						height: '39px',
						backgroundColor: clampedPromptScore == null ? '#A6DDE0' : '#FFFFFF',
						border: '2px solid #000000',
						borderRadius: '8px',
						display: 'flex',
						alignItems: 'center',
						padding: '4px 6px',
						overflow: 'hidden',
						boxSizing: 'border-box',
					}}
				>
					<div
						style={{
							fontFamily: 'Inter, system-ui, sans-serif',
							fontSize: '10px',
							lineHeight: '1.3',
							color: suggestionText1 ? '#000000' : '#888888',
							wordBreak: 'break-word',
							whiteSpace: 'normal',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							display: '-webkit-box',
							WebkitLineClamp: 2,
							WebkitBoxOrient: 'vertical',
						}}
					>
						{suggestionText1 ||
							(clampedPromptScore != null ? 'Add your prompt to get suggestions' : '')}
					</div>
				</div>
			</div>

			{/* Suggestion 2 */}
			<div
				style={{
					position: 'absolute',
					top: `${layout.suggestion2Top}px`,
					left: '50%',
					transform: 'translateX(-50%)',
					width: '315px',
					height: '46px',
					backgroundColor: '#5BB9CB',
					border: '2px solid #000000',
					borderRadius: '8px',
					overflow: 'hidden',
					boxSizing: 'border-box',
				}}
			>
				<div
					className="absolute font-inter font-bold tabular-nums"
					style={{
						top: '4.5px',
						left: '5px',
						fontSize: '11.5px',
						color: '#000000',
					}}
				>
					[2]
				</div>
				<div
					style={{
						position: 'absolute',
						top: '0',
						bottom: '0',
						margin: 'auto',
						right: '6px',
						width: '260px',
						height: '39px',
						backgroundColor: clampedPromptScore == null ? '#5BB9CB' : '#FFFFFF',
						border: '2px solid #000000',
						borderRadius: '8px',
						display: 'flex',
						alignItems: 'center',
						padding: '4px 6px',
						overflow: 'hidden',
						boxSizing: 'border-box',
					}}
				>
					<div
						style={{
							fontFamily: 'Inter, system-ui, sans-serif',
							fontSize: '10px',
							lineHeight: '1.3',
							color: suggestionText2 ? '#000000' : '#888888',
							wordBreak: 'break-word',
							whiteSpace: 'normal',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							display: '-webkit-box',
							WebkitLineClamp: 2,
							WebkitBoxOrient: 'vertical',
						}}
					>
						{suggestionText2 ||
							(clampedPromptScore != null ? 'More suggestions will appear here' : '')}
					</div>
				</div>
			</div>

			{/* Suggestion 3 */}
			<div
				style={{
					position: 'absolute',
					top: `${layout.suggestion3Top}px`,
					left: '50%',
					transform: 'translateX(-50%)',
					width: '315px',
					height: '46px',
					backgroundColor: '#35859D',
					border: '2px solid #000000',
					borderRadius: '8px',
					overflow: 'hidden',
					boxSizing: 'border-box',
				}}
			>
				<div
					className="absolute font-inter font-bold tabular-nums"
					style={{
						top: '4.5px',
						left: '5px',
						fontSize: '11.5px',
						color: '#000000',
					}}
				>
					[3]
				</div>
				<div
					style={{
						position: 'absolute',
						top: '0',
						bottom: '0',
						margin: 'auto',
						right: '6px',
						width: '260px',
						height: '39px',
						backgroundColor: clampedPromptScore == null ? '#35859D' : '#FFFFFF',
						border: '2px solid #000000',
						borderRadius: '8px',
						display: 'flex',
						alignItems: 'center',
						padding: '4px 6px',
						overflow: 'hidden',
						boxSizing: 'border-box',
					}}
				>
					<div
						style={{
							fontFamily: 'Inter, system-ui, sans-serif',
							fontSize: '10px',
							lineHeight: '1.3',
							color: suggestionText3 ? '#000000' : '#888888',
							wordBreak: 'break-word',
							whiteSpace: 'normal',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							display: '-webkit-box',
							WebkitLineClamp: 2,
							WebkitBoxOrient: 'vertical',
						}}
					>
						{suggestionText3 ||
							(clampedPromptScore != null ? 'Additional suggestions here' : '')}
					</div>
				</div>
			</div>
		</div>
	);
};

