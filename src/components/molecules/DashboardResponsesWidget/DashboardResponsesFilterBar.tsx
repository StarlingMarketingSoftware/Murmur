'use client';

import type { CSSProperties, FC } from 'react';
import DashboardActionBarStarIcon from '@/components/atoms/_svg/DashboardActionBarStarIcon';

export type DashboardResponsesTab = 'responses' | 'sent' | 'opportunities';

type ResponseToggleTab = {
	key: DashboardResponsesTab;
	label: string;
	width: number;
	activeFill: string;
};

export const RESPONSE_TOGGLE_TABS: ResponseToggleTab[] = [
	{ key: 'responses', label: 'Responses', width: 104, activeFill: '#98DAFC' },
	{ key: 'sent', label: 'Sent', width: 97, activeFill: '#B0E0A6' },
	{ key: 'opportunities', label: 'Opportunities', width: 145, activeFill: '#FFD5D5' },
];

export const RESPONSE_WIDGET_BACKGROUND_BY_TAB: Record<DashboardResponsesTab, string> = {
	responses: '#84C1E2',
	sent: '#6DB97B',
	opportunities: '#D97676',
};

const getResponseToggleDividerColor = (
	activeTab: DashboardResponsesTab,
	leftTab: DashboardResponsesTab,
	rightTab: DashboardResponsesTab
) => (activeTab === leftTab || activeTab === rightTab ? '#000000' : 'rgba(0,0,0,0.18)');

export const DashboardResponsesFilterBar: FC<{
	activeTab: DashboardResponsesTab;
	onTabChange?: (tab: DashboardResponsesTab) => void;
	width?: number | string;
	height?: number | string;
	fontSize?: number | string;
	className?: string;
	style?: CSSProperties;
	ariaLabel?: string;
}> = ({
	activeTab,
	onTabChange,
	width = 346,
	height = 22,
	fontSize = 14,
	className,
	style,
	ariaLabel = 'Response filters',
}) => {
	const resolvedWidth = typeof width === 'number' ? `${width}px` : width;
	const resolvedHeight = typeof height === 'number' ? `${height}px` : height;
	const resolvedFontSize = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
	const canChangeTab = Boolean(onTabChange);

	return (
		<div
			className={className}
			role="group"
			aria-label={ariaLabel}
			style={{
				position: 'relative',
				width: resolvedWidth,
				height: resolvedHeight,
				borderRadius: '6px',
				backgroundColor: '#FFFFFF',
				display: 'grid',
				gridTemplateColumns: RESPONSE_TOGGLE_TABS.map((tab) => `${tab.width}fr`).join(' '),
				overflow: 'hidden',
				fontFamily: 'Inter, sans-serif',
				fontSize: resolvedFontSize,
				fontWeight: 500,
				lineHeight: '20px',
				color: '#000000',
				...style,
			}}
		>
			{RESPONSE_TOGGLE_TABS.map((tab, index) => {
				const isActive = activeTab === tab.key;
				const previousTab = RESPONSE_TOGGLE_TABS[index - 1]?.key;
				return (
					<button
						key={tab.key}
						type="button"
						aria-pressed={isActive}
						onClick={() => onTabChange?.(tab.key)}
						style={{
							width: '100%',
							height: '100%',
							alignSelf: 'stretch',
							justifySelf: 'stretch',
							border: 'none',
							borderLeft: previousTab
								? `1px solid ${getResponseToggleDividerColor(activeTab, previousTab, tab.key)}`
								: 'none',
							boxSizing: 'border-box',
							background: isActive ? tab.activeFill : '#FFFFFF',
							font: 'inherit',
							color: 'inherit',
							padding: 0,
							cursor: canChangeTab ? 'pointer' : 'default',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: tab.key === 'opportunities' ? '7px' : '0px',
							whiteSpace: 'nowrap',
						}}
					>
						{tab.key === 'opportunities' && (
							<DashboardActionBarStarIcon
								width={15}
								height={15}
								style={{ color: '#E32222', flexShrink: 0 }}
							/>
						)}
						<span>{tab.label}</span>
					</button>
				);
			})}
		</div>
	);
};
