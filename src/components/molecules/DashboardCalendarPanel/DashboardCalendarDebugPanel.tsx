import { FC, useState } from 'react';
import type { DashboardCalendarMockState } from './DashboardCalendarPanel';

type Props = {
	value: DashboardCalendarMockState | undefined;
	onChange: (next: DashboardCalendarMockState | undefined) => void;
};

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
] as const;

const MIN_YEAR = 1900;
const MAX_YEAR = 2200;

const daysInMonth = (year: number, monthIndex: number): number =>
	new Date(year, monthIndex + 1, 0).getDate();

const DEFAULT_STATE: Required<DashboardCalendarMockState> = {
	year: new Date().getFullYear(),
	monthIndex: new Date().getMonth(),
	day: new Date().getDate(),
};

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
	width: '64px',
	padding: '3px 5px',
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
	minWidth: 48,
};

const clamp = (n: number, min: number, max: number): number =>
	Math.max(min, Math.min(max, n));

const NumberStepper: FC<{
	label: string;
	value: number;
	min: number;
	max: number;
	onChange: (n: number) => void;
}> = ({ label, value, min, max, onChange }) => (
	<div style={rowStyle}>
		<span style={labelStyle}>{label}</span>
		<div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
			<button
				type="button"
				style={smallButtonStyle}
				onClick={() => onChange(clamp(value - 1, min, max))}
			>
				−
			</button>
			<input
				type="number"
				min={min}
				max={max}
				value={value}
				onChange={(e) => {
					const next = Number(e.target.value);
					if (Number.isFinite(next)) onChange(clamp(Math.trunc(next), min, max));
				}}
				style={numberInputStyle}
			/>
			<button
				type="button"
				style={smallButtonStyle}
				onClick={() => onChange(clamp(value + 1, min, max))}
			>
				+
			</button>
		</div>
	</div>
);

export const DashboardCalendarDebugPanel: FC<Props> = ({ value, onChange }) => {
	const [collapsed, setCollapsed] = useState(false);

	const overrideActive = value != null;
	const year = value?.year ?? DEFAULT_STATE.year;
	const monthIndex = value?.monthIndex ?? DEFAULT_STATE.monthIndex;
	const day = value?.day ?? DEFAULT_STATE.day;
	const dayMax = daysInMonth(year, monthIndex);
	const clampedDay = clamp(day, 1, dayMax);

	const patch = (partial: Partial<DashboardCalendarMockState>) => {
		const nextYear = partial.year ?? year;
		const nextMonth =
			partial.monthIndex != null ? partial.monthIndex : monthIndex;
		const nextDayMax = daysInMonth(nextYear, nextMonth);
		const nextDayRaw = partial.day != null ? partial.day : day;
		const nextDay = clamp(nextDayRaw, 1, nextDayMax);
		onChange({ year: nextYear, monthIndex: nextMonth, day: nextDay });
	};

	const shiftMonth = (delta: number) => {
		const total = year * 12 + monthIndex + delta;
		const nextYear = Math.floor(total / 12);
		const nextMonth = ((total % 12) + 12) % 12;
		if (nextYear < MIN_YEAR || nextYear > MAX_YEAR) return;
		patch({ year: nextYear, monthIndex: nextMonth });
	};

	const setToday = () => {
		const now = new Date();
		patch({
			year: now.getFullYear(),
			monthIndex: now.getMonth(),
			day: now.getDate(),
		});
	};

	const reset = () => {
		onChange(undefined);
	};

	return (
		<div
			style={{
				position: 'fixed',
				top: 80,
				right: 16,
				width: collapsed ? 'auto' : 300,
				maxHeight: 'calc(100vh - 100px)',
				overflowY: 'auto',
				zIndex: 9999,
				background: 'rgba(255, 255, 255, 0.97)',
				border: '1px solid #333',
				borderRadius: '8px',
				padding: collapsed ? '6px 10px' : '12px',
				boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
				fontFamily: 'Inter, sans-serif',
				fontSize: '12px',
				color: '#1A1A1A',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '8px',
				}}
			>
				<strong style={{ fontSize: '13px' }}>
					Calendar Debug{overrideActive ? '' : ' (off)'}
				</strong>
				<button
					type="button"
					onClick={() => setCollapsed((c) => !c)}
					style={buttonStyle}
				>
					{collapsed ? 'Expand' : 'Collapse'}
				</button>
			</div>

			{!collapsed && (
				<>
					<div
						style={{
							marginTop: 12,
							display: 'flex',
							flexDirection: 'column',
							gap: 6,
						}}
					>
						<NumberStepper
							label="Year"
							value={year}
							min={MIN_YEAR}
							max={MAX_YEAR}
							onChange={(n) => patch({ year: n })}
						/>
						<div style={rowStyle}>
							<span style={labelStyle}>Month</span>
							<select
								value={monthIndex}
								onChange={(e) => patch({ monthIndex: Number(e.target.value) })}
								style={selectStyle}
							>
								{MONTH_NAMES.map((name, idx) => (
									<option key={name} value={idx}>
										{idx + 1}. {name}
									</option>
								))}
							</select>
						</div>
						<NumberStepper
							label="Day"
							value={clampedDay}
							min={1}
							max={dayMax}
							onChange={(n) => patch({ day: n })}
						/>
					</div>

					<div
						style={{
							display: 'flex',
							gap: 6,
							marginTop: 10,
							flexWrap: 'wrap',
						}}
					>
						<button
							type="button"
							style={buttonStyle}
							onClick={() => shiftMonth(-1)}
						>
							◀ Prev month
						</button>
						<button
							type="button"
							style={buttonStyle}
							onClick={() => shiftMonth(1)}
						>
							Next month ▶
						</button>
					</div>

					<div
						style={{
							display: 'flex',
							gap: 6,
							marginTop: 6,
							flexWrap: 'wrap',
						}}
					>
						<button type="button" style={buttonStyle} onClick={setToday}>
							Today
						</button>
						<button
							type="button"
							style={buttonStyle}
							onClick={() => patch({ year: 2024, monthIndex: 1, day: 29 })}
						>
							Leap Feb 2024
						</button>
						<button
							type="button"
							style={buttonStyle}
							onClick={() => patch({ year: 2026, monthIndex: 0, day: 1 })}
						>
							Jan 2026
						</button>
					</div>

					<hr
						style={{ margin: '12px 0', border: 0, borderTop: '1px solid #eee' }}
					/>

					<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
						{!overrideActive ? (
							<button
								type="button"
								style={{ ...buttonStyle, background: '#E0F0FF' }}
								onClick={() =>
									onChange({
										year: DEFAULT_STATE.year,
										monthIndex: DEFAULT_STATE.monthIndex,
										day: DEFAULT_STATE.day,
									})
								}
							>
								Enable override
							</button>
						) : (
							<button type="button" style={buttonStyle} onClick={reset}>
								Use real data
							</button>
						)}
					</div>

					<div style={{ color: '#888', marginTop: 8, lineHeight: 1.4 }}>
						Year/Month re-renders the grid against any month. Day highlights the
						matching in-month cell so you can verify alignment near month
						boundaries and leap days.
					</div>
				</>
			)}
		</div>
	);
};

export default DashboardCalendarDebugPanel;
