import { FC, useEffect, useState } from 'react';
import type {
	OpportunitiesMockRow,
	OpportunitiesMockState,
	OpportunityStatus,
} from './DashboardOpportunitiesWidget';

type Props = {
	value: OpportunitiesMockState | undefined;
	onChange: (next: OpportunitiesMockState | undefined) => void;
};

const MAX_ROWS = 15;

const STATUS_OPTIONS: Array<{ value: OpportunityStatus; label: string }> = [
	{ value: 'booked', label: 'Booked' },
	{ value: 'closed', label: 'Closed' },
	{ value: 'in-progress', label: 'In Progress' },
];

const DEFAULT_ROWS: OpportunitiesMockRow[] = [
	{
		status: 'booked',
		contactLabel: 'Stargazer Hall / Maria Lin',
		exchangeCount: 4,
		folder: 'Spring Tour',
		category: 'Music Venues',
		location: 'Brooklyn, NY',
		stateAbbr: 'NY',
		opportunityType: 'Acoustic set',
		opportunityDate: 'Jun 12th',
		lastMessage: "Confirmed for the 12th — we'll send the contract tomorrow.",
		lastReceivedLabel: '2:14pm',
	},
	{
		status: 'in-progress',
		contactLabel: 'Blue Note Cafe / Jordan Pierce',
		exchangeCount: 2,
		folder: 'Spring Tour',
		category: 'Coffee Shops',
		location: 'Portland, OR',
		stateAbbr: 'OR',
		opportunityType: 'Friday residency',
		opportunityDate: 'Jul 5th',
		lastMessage: 'Holding the date for you — checking with our booker on rate.',
		lastReceivedLabel: 'Jun 2nd',
	},
	{
		status: 'closed',
		contactLabel: 'The Iron Room / Casey Park',
		exchangeCount: 3,
		folder: 'Summer Outreach',
		category: 'Restaurants',
		location: 'Austin, TX',
		stateAbbr: 'TX',
		opportunityType: 'Headline slot',
		opportunityDate: 'Aug 20th',
		lastMessage: 'Unfortunately we already booked the room for that weekend.',
		lastReceivedLabel: 'May 28th',
	},
];

const blankRow = (index: number): OpportunitiesMockRow => ({
	status: 'booked',
	contactLabel: `Mock Venue ${index + 1}`,
	exchangeCount: 1,
	folder: 'Campaign',
	category: 'Music Venues',
	location: '',
	stateAbbr: '',
	opportunityType: 'Opportunity',
	opportunityDate: 'Date TBD',
	lastMessage: '',
	lastReceivedLabel: '',
});

const buildState = (rows: OpportunitiesMockRow[]): OpportunitiesMockState => ({ rows });

const buttonStyle: React.CSSProperties = {
	padding: '4px 10px',
	border: '1px solid #999',
	borderRadius: '4px',
	background: '#fff',
	fontSize: '12px',
	cursor: 'pointer',
};

const smallButtonStyle: React.CSSProperties = {
	...buttonStyle,
	padding: '2px 8px',
	fontSize: '11px',
};

const numberInputStyle: React.CSSProperties = {
	width: '56px',
	padding: '3px 5px',
	border: '1px solid #ccc',
	borderRadius: '4px',
	fontSize: '12px',
};

const textInputStyle: React.CSSProperties = {
	flex: 1,
	minWidth: 0,
	padding: '3px 6px',
	border: '1px solid #ccc',
	borderRadius: '4px',
	fontSize: '12px',
};

const selectStyle: React.CSSProperties = {
	flex: 1,
	padding: '3px 5px',
	border: '1px solid #ccc',
	borderRadius: '4px',
	fontSize: '12px',
	background: '#fff',
};

const rowStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	gap: '8px',
};

const labelStyle: React.CSSProperties = {
	fontSize: '11px',
	fontWeight: 500,
	color: '#333',
	minWidth: 78,
};

const rowSummaryStyle: React.CSSProperties = {
	display: 'block',
	overflow: 'hidden',
	textOverflow: 'ellipsis',
	whiteSpace: 'nowrap',
	fontSize: '11px',
	fontWeight: 500,
	color: '#666',
};

const adjustValue = (current: number, delta: number) => Math.max(0, current + delta);

const getStatusLabel = (status: OpportunityStatus | undefined) =>
	STATUS_OPTIONS.find((option) => option.value === (status ?? 'booked'))?.label ??
	'Booked';

const NumberField: FC<{
	label: string;
	value: number;
	onChange: (n: number) => void;
}> = ({ label, value, onChange }) => (
	<div style={rowStyle}>
		<span style={labelStyle}>{label}</span>
		<div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
			<button
				type="button"
				style={smallButtonStyle}
				onClick={() => onChange(adjustValue(value, -1))}
			>
				−
			</button>
			<input
				type="number"
				min={0}
				value={value}
				onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
				onWheel={(e) => e.currentTarget.blur()}
				style={numberInputStyle}
			/>
			<button
				type="button"
				style={smallButtonStyle}
				onClick={() => onChange(adjustValue(value, 1))}
			>
				+
			</button>
		</div>
	</div>
);

const TextField: FC<{
	label: string;
	value: string;
	placeholder?: string;
	onChange: (next: string) => void;
}> = ({ label, value, placeholder, onChange }) => (
	<div style={rowStyle}>
		<span style={labelStyle}>{label}</span>
		<input
			type="text"
			value={value}
			placeholder={placeholder}
			onChange={(e) => onChange(e.target.value)}
			style={textInputStyle}
		/>
	</div>
);

const RowCard: FC<{
	index: number;
	row: OpportunitiesMockRow;
	isCollapsed: boolean;
	onToggleCollapsed: () => void;
	onChange: (next: OpportunitiesMockRow) => void;
	onRemove: () => void;
	canRemove: boolean;
}> = ({ index, row, isCollapsed, onToggleCollapsed, onChange, onRemove, canRemove }) => {
	const patch = (partial: Partial<OpportunitiesMockRow>) =>
		onChange({ ...row, ...partial });
	const contactLabel = row.contactLabel?.trim() || 'No contact';
	const rowSummary = `${getStatusLabel(row.status)} - ${contactLabel}`;

	return (
		<div
			style={{
				border: '1px solid #DDD',
				borderRadius: '6px',
				padding: '8px',
				background: '#FAFAFA',
				display: 'flex',
				flexDirection: 'column',
				gap: 6,
			}}
		>
			<div style={{ ...rowStyle, alignItems: 'flex-start' }}>
				<button
					type="button"
					aria-expanded={!isCollapsed}
					onClick={onToggleCollapsed}
					style={{
						flex: 1,
						minWidth: 0,
						padding: 0,
						border: 0,
						background: 'transparent',
						textAlign: 'left',
						cursor: 'pointer',
					}}
				>
					<span style={{ ...labelStyle, display: 'block', fontWeight: 700 }}>
						Row {index + 1}
					</span>
					{isCollapsed && <span style={rowSummaryStyle}>{rowSummary}</span>}
				</button>
				<div style={{ display: 'flex', gap: 4 }}>
					<button type="button" style={smallButtonStyle} onClick={onToggleCollapsed}>
						{isCollapsed ? 'Expand' : 'Collapse'}
					</button>
					{canRemove && (
						<button type="button" style={smallButtonStyle} onClick={onRemove}>
							Remove
						</button>
					)}
				</div>
			</div>
			{!isCollapsed && (
				<>
					<div style={rowStyle}>
						<span style={labelStyle}>Status</span>
						<select
							value={row.status ?? 'booked'}
							onChange={(e) => patch({ status: e.target.value as OpportunityStatus })}
							style={selectStyle}
						>
							{STATUS_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
					<TextField
						label="Contact"
						value={row.contactLabel ?? ''}
						placeholder="Company / Name"
						onChange={(next) => patch({ contactLabel: next })}
					/>
					<NumberField
						label="Exchanges"
						value={row.exchangeCount ?? 1}
						onChange={(n) => patch({ exchangeCount: n })}
					/>
					<TextField
						label="Folder"
						value={row.folder ?? ''}
						placeholder="Campaign"
						onChange={(next) => patch({ folder: next })}
					/>
					<TextField
						label="Category"
						value={row.category ?? ''}
						placeholder="Music Venues"
						onChange={(next) => patch({ category: next })}
					/>
					<TextField
						label="Location"
						value={row.location ?? ''}
						placeholder="City"
						onChange={(next) => patch({ location: next })}
					/>
					<TextField
						label="State"
						value={row.stateAbbr ?? ''}
						placeholder="NY"
						onChange={(next) => patch({ stateAbbr: next.toUpperCase().slice(0, 2) })}
					/>
					<TextField
						label="Type"
						value={row.opportunityType ?? ''}
						placeholder="Acoustic set"
						onChange={(next) => patch({ opportunityType: next })}
					/>
					<TextField
						label="Date"
						value={row.opportunityDate ?? ''}
						placeholder="Jun 12th"
						onChange={(next) => patch({ opportunityDate: next })}
					/>
					<TextField
						label="Message"
						value={row.lastMessage ?? ''}
						placeholder="Last message snippet"
						onChange={(next) => patch({ lastMessage: next })}
					/>
					<TextField
						label="Received"
						value={row.lastReceivedLabel ?? ''}
						placeholder="2:14pm or Jun 2nd"
						onChange={(next) => patch({ lastReceivedLabel: next })}
					/>
				</>
			)}
		</div>
	);
};

export const DashboardOpportunitiesDebugPanel: FC<Props> = ({ value, onChange }) => {
	const [collapsed, setCollapsed] = useState(false);
	const [collapsedRowIndexes, setCollapsedRowIndexes] = useState<Set<number>>(
		() => new Set()
	);

	const initialRows = value?.rows?.length
		? value.rows.slice(0, MAX_ROWS)
		: DEFAULT_ROWS.slice();
	const [rows, setRows] = useState<OpportunitiesMockRow[]>(initialRows);

	const overrideActive = value != null;
	const rowCount = rows.length;
	const allRowsCollapsed = rowCount > 0 && collapsedRowIndexes.size >= rowCount;

	useEffect(() => {
		// Auto-enable override on any field edit so the panel feels "live".
		onChange(buildState(rows));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rows]);

	const setRowAt = (index: number, next: OpportunitiesMockRow) => {
		setRows((prev) => {
			const copy = prev.slice();
			copy[index] = next;
			return copy;
		});
	};

	const addRow = () => {
		setRows((prev) => {
			if (prev.length >= MAX_ROWS) return prev;
			return [...prev, blankRow(prev.length)];
		});
	};

	const toggleRowCollapsed = (index: number) => {
		setCollapsedRowIndexes((prev) => {
			const next = new Set(prev);
			if (next.has(index)) next.delete(index);
			else next.add(index);
			return next;
		});
	};

	const collapseAllRows = () => {
		setCollapsedRowIndexes(new Set(rows.map((_, index) => index)));
	};

	const expandAllRows = () => {
		setCollapsedRowIndexes(new Set());
	};

	const removeRowAt = (index: number) => {
		setRows((prev) => {
			if (prev.length <= 1) return prev;
			return prev.slice(0, index).concat(prev.slice(index + 1));
		});
		setCollapsedRowIndexes((prev) => {
			const next = new Set<number>();
			prev.forEach((rowIndex) => {
				if (rowIndex < index) next.add(rowIndex);
				if (rowIndex > index) next.add(rowIndex - 1);
			});
			return next;
		});
	};

	const reset = () => {
		setRows(DEFAULT_ROWS.slice());
		setCollapsedRowIndexes(new Set());
		onChange(undefined);
	};

	return (
		<div
			className="dashboard-opportunities-debug-panel"
			onWheel={(e) => e.stopPropagation()}
			onTouchMove={(e) => e.stopPropagation()}
			style={{
				position: 'fixed',
				top: 80,
				right: 16,
				bottom: collapsed ? undefined : 16,
				width: collapsed ? 'auto' : 320,
				maxWidth: 'calc(100vw - 32px)',
				overflow: 'hidden',
				zIndex: 9999,
				background: 'rgba(255, 255, 255, 0.97)',
				border: '1px solid #333',
				borderRadius: '8px',
				padding: collapsed ? '6px 10px' : '12px',
				boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
				display: 'flex',
				flexDirection: 'column',
				fontFamily: 'Inter, sans-serif',
				fontSize: '12px',
				color: '#1A1A1A',
			}}
		>
			<style>{`
				.dashboard-opportunities-debug-panel__body::-webkit-scrollbar {
					width: 14px;
					-webkit-appearance: none;
				}
				.dashboard-opportunities-debug-panel__body::-webkit-scrollbar-track {
					background: #f0f0f0;
					border-left: 1px solid #ccc;
				}
				.dashboard-opportunities-debug-panel__body::-webkit-scrollbar-thumb {
					background: #888;
					border-radius: 7px;
					border: 3px solid #f0f0f0;
				}
				.dashboard-opportunities-debug-panel__body::-webkit-scrollbar-thumb:hover {
					background: #555;
				}
			`}</style>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '8px',
				}}
			>
				<strong style={{ fontSize: '13px' }}>
					Opportunities Debug{overrideActive ? '' : ' (off)'}
				</strong>
				<button type="button" onClick={() => setCollapsed((c) => !c)} style={buttonStyle}>
					{collapsed ? 'Expand' : 'Collapse'}
				</button>
			</div>

			{!collapsed && (
				<div
					className="dashboard-opportunities-debug-panel__body"
					style={{
						flex: 1,
						minHeight: 0,
						overflowY: 'auto',
						overscrollBehavior: 'contain',
						paddingRight: 2,
						touchAction: 'pan-y',
					}}
				>
					<div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
						<button
							type="button"
							style={buttonStyle}
							onClick={addRow}
							disabled={rowCount >= MAX_ROWS}
						>
							+ Add row ({rowCount}/{MAX_ROWS})
						</button>
						<button
							type="button"
							style={buttonStyle}
							onClick={allRowsCollapsed ? expandAllRows : collapseAllRows}
						>
							{allRowsCollapsed ? 'Expand rows' : 'Collapse rows'}
						</button>
					</div>

					<hr style={{ margin: '10px 0', border: 0, borderTop: '1px solid #eee' }} />

					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{rows.map((row, index) => (
							<RowCard
								key={`opportunity-row-${index}`}
								index={index}
								row={row}
								isCollapsed={collapsedRowIndexes.has(index)}
								onToggleCollapsed={() => toggleRowCollapsed(index)}
								onChange={(next) => setRowAt(index, next)}
								onRemove={() => removeRowAt(index)}
								canRemove={rows.length > 1}
							/>
						))}
					</div>

					<hr style={{ margin: '12px 0', border: 0, borderTop: '1px solid #eee' }} />

					<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
						{!overrideActive ? (
							<button
								type="button"
								style={{ ...buttonStyle, background: '#E0F0FF' }}
								onClick={() => onChange(buildState(rows))}
							>
								Enable override
							</button>
						) : (
							<button
								type="button"
								style={buttonStyle}
								onClick={() => onChange(undefined)}
							>
								Use real data
							</button>
						)}
						<button type="button" style={buttonStyle} onClick={reset}>
							Reset
						</button>
					</div>

					<div style={{ color: '#888', marginTop: 8, lineHeight: 1.4 }}>
						Status drives which sub-tab (Booked / Closed / In Progress) shows the row and
						the chip color. State (2-letter) renders the colored state badge. Leave fields
						blank to fall back to placeholders.
					</div>
				</div>
			)}
		</div>
	);
};

export default DashboardOpportunitiesDebugPanel;
