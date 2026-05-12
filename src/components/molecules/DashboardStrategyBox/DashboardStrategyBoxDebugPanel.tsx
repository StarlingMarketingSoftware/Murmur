import { FC, useEffect, useState } from 'react';
import type { StrategyMockState } from './DashboardStrategyBox';

type Props = {
	value: StrategyMockState | undefined;
	onChange: (next: StrategyMockState | undefined) => void;
};

const CAMPAIGN_NAME = 'Orion';
const CAMPAIGN_ID = 1;

const buildState = (
	contacts: number,
	drafts: number,
	sent: number,
	newEmails: number
): StrategyMockState => ({
	campaigns: [
		{
			id: CAMPAIGN_ID,
			name: CAMPAIGN_NAME,
			contactCount: contacts,
			draftCount: drafts,
			sentCount: sent,
		},
	],
	newEmailCount: newEmails,
});

const buttonStyle: React.CSSProperties = {
	padding: '4px 10px',
	border: '1px solid #999',
	borderRadius: '4px',
	background: '#fff',
	fontSize: '12px',
	cursor: 'pointer',
};

const numberInputStyle: React.CSSProperties = {
	width: '70px',
	padding: '4px 6px',
	border: '1px solid #ccc',
	borderRadius: '4px',
	fontSize: '13px',
};

const rowStyle: React.CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	gap: '10px',
};

const labelStyle: React.CSSProperties = {
	fontSize: '13px',
	fontWeight: 500,
};

const adjustValue = (current: number, delta: number) => Math.max(0, current + delta);

const Field: FC<{
	label: string;
	value: number;
	onChangeValue: (n: number) => void;
}> = ({ label, value: v, onChangeValue }) => (
	<div style={rowStyle}>
		<span style={labelStyle}>{label}</span>
		<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
			<button
				type="button"
				style={buttonStyle}
				onClick={() => onChangeValue(adjustValue(v, -1))}
			>
				−
			</button>
			<input
				type="number"
				min={0}
				value={v}
				onChange={(e) =>
					onChangeValue(Math.max(0, Number(e.target.value) || 0))
				}
				style={numberInputStyle}
			/>
			<button
				type="button"
				style={buttonStyle}
				onClick={() => onChangeValue(adjustValue(v, 1))}
			>
				+
			</button>
		</div>
	</div>
);

export const DashboardStrategyBoxDebugPanel: FC<Props> = ({ value, onChange }) => {
	const [collapsed, setCollapsed] = useState(false);

	const firstCampaign = value?.campaigns?.[0];
	const [contacts, setContacts] = useState<number>(firstCampaign?.contactCount ?? 0);
	const [drafts, setDrafts] = useState<number>(firstCampaign?.draftCount ?? 0);
	const [sent, setSent] = useState<number>(firstCampaign?.sentCount ?? 0);
	const [newEmails, setNewEmails] = useState<number>(value?.newEmailCount ?? 0);

	const overrideActive = value != null;

	useEffect(() => {
		// Always propagate field edits — auto-enable the override when the user
		// touches any number so they don't have to click "Enable override" first.
		onChange(buildState(contacts, drafts, sent, newEmails));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [contacts, drafts, sent, newEmails]);

	const enableOverride = () => {
		onChange(buildState(contacts, drafts, sent, newEmails));
	};

	const reset = () => {
		setContacts(0);
		setDrafts(0);
		setSent(0);
		setNewEmails(0);
		onChange(undefined);
	};

	return (
		<div
			style={{
				position: 'fixed',
				top: 80,
				right: 16,
				width: collapsed ? 'auto' : 280,
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
					Strategy Debug — {CAMPAIGN_NAME}
					{overrideActive ? '' : ' (off)'}
				</strong>
				<button type="button" onClick={() => setCollapsed((c) => !c)} style={buttonStyle}>
					{collapsed ? 'Expand' : 'Collapse'}
				</button>
			</div>

			{!collapsed && (
				<>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 8,
							marginTop: 12,
						}}
					>
						<Field label="New Emails" value={newEmails} onChangeValue={setNewEmails} />
						<Field label="Contacts" value={contacts} onChangeValue={setContacts} />
						<Field label="Drafts" value={drafts} onChangeValue={setDrafts} />
						<Field label="Sent" value={sent} onChangeValue={setSent} />
					</div>

					<hr style={{ margin: '12px 0', border: 0, borderTop: '1px solid #eee' }} />

					<div style={{ display: 'flex', gap: 6 }}>
						{!overrideActive ? (
							<button
								type="button"
								style={{ ...buttonStyle, background: '#E0F0FF' }}
								onClick={enableOverride}
							>
								Enable override
							</button>
						) : (
							<button type="button" style={buttonStyle} onClick={() => onChange(undefined)}>
								Use real data
							</button>
						)}
						<button type="button" style={buttonStyle} onClick={reset}>
							Reset to 0
						</button>
					</div>

					<div style={{ color: '#888', marginTop: 8, lineHeight: 1.4 }}>
						"Contacts needing draft" = Contacts − Drafts − Sent.
						<br />
						Replies outrank drafts; drafts outrank drafting new contacts.
					</div>
				</>
			)}
		</div>
	);
};

export default DashboardStrategyBoxDebugPanel;
