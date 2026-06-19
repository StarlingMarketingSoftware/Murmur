import { FC, useEffect, useState } from 'react';
import type {
	ResponsesMockRow,
	ResponsesMockState,
	ResponsesMockTab,
} from './DashboardResponsesWidget';

type Props = {
	value: ResponsesMockState | undefined;
	onChange: (next: ResponsesMockState | undefined) => void;
};

const MAX_ROWS = 18;

const TAB_OPTIONS: Array<{ value: ResponsesMockTab; label: string }> = [
	{ value: 'responses', label: 'Responses' },
	{ value: 'sent', label: 'Sent' },
	{ value: 'opportunities', label: 'Opportunities' },
];

const HEADLINE_PRESETS = [
	'Music Venue',
	'Coffee Shop',
	'Restaurant',
	'Music Festival',
	'Wedding Venue',
	'Wedding Planner',
	'Brewery',
	'Winery',
	'Distillery',
	'(none)',
];

const isoMinutesAgo = (minutes: number) =>
	new Date(Date.now() - minutes * 60_000).toISOString();
const isoDaysAgo = (days: number) =>
	new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();

const DEFAULT_ROWS: ResponsesMockRow[] = [
	// Opportunity — booked, full contact, music venue
	{
		tab: 'opportunities',
		senderName: 'Maria Lin',
		senderEmail: 'maria@stargazerhall.com',
		subject: 'Re: Booking for June',
		body: "Confirmed for the 12th — we'd love to have you. We'll send the contract tomorrow. Doors at 8, set at 9.",
		receivedIso: isoMinutesAgo(95),
		withContact: true,
		contactFirstName: 'Maria',
		contactLastName: 'Lin',
		contactCompany: 'Stargazer Hall',
		contactHeadline: 'Music Venue',
		contactState: 'NY',
		contactCity: 'Brooklyn',
		campaignName: 'Spring Tour',
	},
	// Opportunity — in-progress, coffee shop
	{
		tab: 'opportunities',
		senderName: 'Jordan Pierce',
		senderEmail: 'jordan@bluenotecafe.com',
		subject: 'Re: Friday residency idea',
		body: "Holding the date for you — we're checking with our booker on rate and will follow up Thursday.",
		receivedIso: isoDaysAgo(2),
		withContact: true,
		contactFirstName: 'Jordan',
		contactLastName: 'Pierce',
		contactCompany: 'Blue Note Cafe',
		contactHeadline: 'Coffee Shop',
		contactState: 'OR',
		contactCity: 'Portland',
		campaignName: 'Spring Tour',
	},
	// Opportunity — closed, restaurant
	{
		tab: 'opportunities',
		senderName: 'Casey Park',
		senderEmail: 'casey@theironroom.com',
		subject: 'Re: Aug 20th',
		body: "Unfortunately we're already fully booked that weekend. We'll pass for now — try us again in the fall.",
		receivedIso: isoDaysAgo(6),
		withContact: true,
		contactFirstName: 'Casey',
		contactLastName: 'Park',
		contactCompany: 'The Iron Room',
		contactHeadline: 'Restaurant',
		contactState: 'TX',
		contactCity: 'Austin',
		campaignName: 'Summer Outreach',
	},
	// Plain response, full contact, wine/beer
	{
		tab: 'responses',
		senderName: 'Sasha Reyes',
		senderEmail: 'sasha@bramblevines.com',
		subject: 'Tasting room patio shows',
		body: "Thanks for reaching out — we run an acoustic series most Sundays. Can you share dates you're targeting?",
		receivedIso: isoMinutesAgo(30),
		withContact: true,
		contactFirstName: 'Sasha',
		contactLastName: 'Reyes',
		contactCompany: 'Bramble Vines',
		contactHeadline: 'Winery',
		contactState: 'CA',
		contactCity: 'Sonoma',
		campaignName: 'West Coast Wineries',
	},
	// Plain response, NO contact attached (unattached reply)
	{
		tab: 'responses',
		senderName: 'Hello',
		senderEmail: 'hello@oldoakbrewing.com',
		subject: 'Question about your reach-out',
		body: "Hey — saw your email come into our general inbox. Can you tell us a bit more about the show format?",
		receivedIso: isoMinutesAgo(180),
		withContact: false,
	},
	// Plain response, contact name only no company
	{
		tab: 'responses',
		senderName: 'Devon Hart',
		senderEmail: 'devonhart@gmail.com',
		subject: 'Loved your demo',
		body: "Picked up your EP last week and had to write. If you ever come through Nashville let me know.",
		receivedIso: isoDaysAgo(1),
		withContact: true,
		contactFirstName: 'Devon',
		contactLastName: 'Hart',
		contactState: 'TN',
		contactCity: 'Nashville',
	},
	// Sent, full contact, wedding planner
	{
		tab: 'sent',
		senderName: 'Priya Shah',
		senderEmail: 'priya@meadowknotevents.com',
		subject: 'Live music for your fall weddings',
		body: "Hi Priya — wanted to introduce ourselves. We're a duo doing ceremony + cocktail-hour sets...",
		receivedIso: isoMinutesAgo(15),
		withContact: true,
		contactFirstName: 'Priya',
		contactLastName: 'Shah',
		contactCompany: 'Meadow Knot Events',
		contactHeadline: 'Wedding Planner',
		contactState: 'CO',
		contactCity: 'Denver',
		campaignName: 'Fall Wedding Outreach',
	},
	// Sent, NO contact attached (manual one-off send)
	{
		tab: 'sent',
		senderName: 'Booking',
		senderEmail: 'booking@thefoxden.org',
		subject: 'Following up on our March pitch',
		body: "Hi again — circling back to see if you had a chance to talk it over with the team.",
		receivedIso: isoDaysAgo(3),
		withContact: false,
	},
	// Sent, contact + music festival category
	{
		tab: 'sent',
		senderName: 'Naomi West',
		senderEmail: 'naomi@harborlightsfest.com',
		subject: 'Submission for Harbor Lights 2026',
		body: "Hi Naomi — attaching our EPK and a few links from last summer's run. Would love to be considered for the indie slot.",
		receivedIso: isoDaysAgo(4),
		withContact: true,
		contactFirstName: 'Naomi',
		contactLastName: 'West',
		contactCompany: 'Harbor Lights Festival',
		contactHeadline: 'Music Festival',
		contactState: 'ME',
		contactCity: 'Portland',
		campaignName: 'Festival Submissions',
	},
];

const blankRow = (index: number): ResponsesMockRow => ({
	tab: 'responses',
	senderName: `Mock Sender ${index + 1}`,
	senderEmail: `mock${index + 1}@example.com`,
	subject: 'Mock subject',
	body: 'Mock body content for testing the dashboard responses widget.',
	receivedIso: isoMinutesAgo((index + 1) * 30),
	withContact: false,
});

const buildState = (rows: ResponsesMockRow[]): ResponsesMockState => ({ rows });

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

const textareaStyle: React.CSSProperties = {
	flex: 1,
	minWidth: 0,
	padding: '4px 6px',
	border: '1px solid #ccc',
	borderRadius: '4px',
	fontSize: '12px',
	fontFamily: 'inherit',
	resize: 'vertical',
	minHeight: 48,
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

const getTabLabel = (tab: ResponsesMockTab | undefined) =>
	TAB_OPTIONS.find((t) => t.value === (tab ?? 'responses'))?.label ?? 'Responses';

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

const TextAreaField: FC<{
	label: string;
	value: string;
	placeholder?: string;
	onChange: (next: string) => void;
}> = ({ label, value, placeholder, onChange }) => (
	<div style={{ ...rowStyle, alignItems: 'flex-start' }}>
		<span style={{ ...labelStyle, paddingTop: 4 }}>{label}</span>
		<textarea
			value={value}
			placeholder={placeholder}
			onChange={(e) => onChange(e.target.value)}
			style={textareaStyle}
			rows={3}
		/>
	</div>
);

const RowCard: FC<{
	index: number;
	row: ResponsesMockRow;
	isCollapsed: boolean;
	onToggleCollapsed: () => void;
	onChange: (next: ResponsesMockRow) => void;
	onRemove: () => void;
	canRemove: boolean;
}> = ({ index, row, isCollapsed, onToggleCollapsed, onChange, onRemove, canRemove }) => {
	const patch = (partial: Partial<ResponsesMockRow>) => onChange({ ...row, ...partial });
	const senderLabel = row.senderName?.trim() || row.senderEmail?.trim() || 'No sender';
	const rowSummary = `${getTabLabel(row.tab)} · ${senderLabel}`;
	const wantsContact =
		row.withContact ??
		Boolean(
			row.contactFirstName ||
				row.contactLastName ||
				row.contactCompany ||
				row.contactHeadline ||
				row.contactState ||
				row.contactCity
		);

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
						<span style={labelStyle}>Tab</span>
						<select
							value={row.tab ?? 'responses'}
							onChange={(e) => patch({ tab: e.target.value as ResponsesMockTab })}
							style={selectStyle}
						>
							{TAB_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>
					<TextField
						label="Sender name"
						value={row.senderName ?? ''}
						placeholder="Maria Lin"
						onChange={(next) => patch({ senderName: next })}
					/>
					<TextField
						label="Sender email"
						value={row.senderEmail ?? ''}
						placeholder="maria@stargazerhall.com"
						onChange={(next) => patch({ senderEmail: next })}
					/>
					<TextField
						label="Subject"
						value={row.subject ?? ''}
						placeholder="Re: Booking for June"
						onChange={(next) => patch({ subject: next })}
					/>
					<TextAreaField
						label="Body"
						value={row.body ?? ''}
						placeholder="Email body content..."
						onChange={(next) => patch({ body: next })}
					/>
					<TextField
						label="Received ISO"
						value={row.receivedIso ?? ''}
						placeholder="2026-05-16T14:00:00Z"
						onChange={(next) => patch({ receivedIso: next })}
					/>
					<div style={rowStyle}>
						<span style={labelStyle}>Contact</span>
						<label
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 6,
								flex: 1,
								fontSize: '11px',
								color: '#444',
							}}
						>
							<input
								type="checkbox"
								checked={wantsContact}
								onChange={(e) => patch({ withContact: e.target.checked })}
							/>
							Tied to contact record
						</label>
					</div>
					{wantsContact && (
						<>
							<TextField
								label="First name"
								value={row.contactFirstName ?? ''}
								placeholder="Maria"
								onChange={(next) => patch({ contactFirstName: next })}
							/>
							<TextField
								label="Last name"
								value={row.contactLastName ?? ''}
								placeholder="Lin"
								onChange={(next) => patch({ contactLastName: next })}
							/>
							<TextField
								label="Company"
								value={row.contactCompany ?? ''}
								placeholder="Stargazer Hall"
								onChange={(next) => patch({ contactCompany: next })}
							/>
							<div style={rowStyle}>
								<span style={labelStyle}>Category</span>
								<select
									value={row.contactHeadline ?? ''}
									onChange={(e) =>
										patch({
											contactHeadline: e.target.value === '(none)' ? '' : e.target.value,
										})
									}
									style={selectStyle}
								>
									<option value="">(custom / blank)</option>
									{HEADLINE_PRESETS.map((preset) => (
										<option key={preset} value={preset}>
											{preset}
										</option>
									))}
								</select>
							</div>
							<TextField
								label="Headline"
								value={row.contactHeadline ?? ''}
								placeholder="Music Venue / Coffee Shop / etc."
								onChange={(next) => patch({ contactHeadline: next })}
							/>
							<TextField
								label="State"
								value={row.contactState ?? ''}
								placeholder="NY"
								onChange={(next) =>
									patch({ contactState: next.toUpperCase().slice(0, 2) })
								}
							/>
							<TextField
								label="City"
								value={row.contactCity ?? ''}
								placeholder="Brooklyn"
								onChange={(next) => patch({ contactCity: next })}
							/>
							<TextField
								label="Campaign"
								value={row.campaignName ?? ''}
								placeholder="Spring Tour"
								onChange={(next) => patch({ campaignName: next })}
							/>
						</>
					)}
				</>
			)}
		</div>
	);
};

export const DashboardResponsesDebugPanel: FC<Props> = ({ value, onChange }) => {
	const [collapsed, setCollapsed] = useState(false);
	const [collapsedRowIndexes, setCollapsedRowIndexes] = useState<Set<number>>(
		() => new Set()
	);

	const initialRows = value?.rows?.length
		? value.rows.slice(0, MAX_ROWS)
		: DEFAULT_ROWS.slice();
	const [rows, setRows] = useState<ResponsesMockRow[]>(initialRows);

	const overrideActive = value != null;
	const rowCount = rows.length;
	const allRowsCollapsed = rowCount > 0 && collapsedRowIndexes.size >= rowCount;

	useEffect(() => {
		onChange(buildState(rows));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rows]);

	const setRowAt = (index: number, next: ResponsesMockRow) => {
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
			className="dashboard-responses-debug-panel"
			onWheel={(e) => e.stopPropagation()}
			onTouchMove={(e) => e.stopPropagation()}
			style={{
				position: 'fixed',
				top: 80,
				right: 16,
				bottom: collapsed ? undefined : 16,
				width: collapsed ? 'auto' : 340,
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
				.dashboard-responses-debug-panel__body::-webkit-scrollbar {
					width: 14px;
					-webkit-appearance: none;
				}
				.dashboard-responses-debug-panel__body::-webkit-scrollbar-track {
					background: #f0f0f0;
					border-left: 1px solid #ccc;
				}
				.dashboard-responses-debug-panel__body::-webkit-scrollbar-thumb {
					background: #888;
					border-radius: 7px;
					border: 3px solid #f0f0f0;
				}
				.dashboard-responses-debug-panel__body::-webkit-scrollbar-thumb:hover {
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
					Inbox Debug{overrideActive ? '' : ' (off)'}
				</strong>
				<button type="button" onClick={() => setCollapsed((c) => !c)} style={buttonStyle}>
					{collapsed ? 'Expand' : 'Collapse'}
				</button>
			</div>

			{!collapsed && (
				<div
					className="dashboard-responses-debug-panel__body"
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
								key={`responses-row-${index}`}
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
						Tab routes the row to Responses / Sent / Opportunities. Rows tagged
						Opportunities also show in Responses (matches real-data behavior). Toggle
						&quot;Tied to contact record&quot; to switch between contact-attached and unattached
						(generic inbox) rows. Category drives the icon; State drives the badge.
					</div>
				</div>
			)}
		</div>
	);
};

export default DashboardResponsesDebugPanel;
