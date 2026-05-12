import { FC, useEffect, useState } from 'react';
import type { CampaignsMockFolder, CampaignsMockState } from './CampaignsTable';

type Props = {
	value: CampaignsMockState | undefined;
	onChange: (next: CampaignsMockState | undefined) => void;
};

const MAX_FOLDERS = 5;

const DEFAULT_NAMES = ['Orion', 'Leo', 'Pieces', 'Capricorn', 'Sagittarius'];

const blankFolder = (index: number): CampaignsMockFolder => ({
	name: DEFAULT_NAMES[index] ?? `Folder ${index + 1}`,
	draftCount: 0,
	sentCount: 0,
	updatedDaysAgo: 0,
	newEmailCount: 0,
});

const buildState = (folders: CampaignsMockFolder[]): CampaignsMockState => ({
	folders,
});

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
};

const adjustValue = (current: number, delta: number) => Math.max(0, current + delta);

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

const FolderCard: FC<{
	index: number;
	folder: CampaignsMockFolder;
	onChange: (next: CampaignsMockFolder) => void;
}> = ({ index, folder, onChange }) => {
	const patch = (partial: Partial<CampaignsMockFolder>) => onChange({ ...folder, ...partial });
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
			<div style={rowStyle}>
				<span style={{ ...labelStyle, fontWeight: 700 }}>Folder {index + 1}</span>
				<input
					type="text"
					value={folder.name ?? ''}
					placeholder={DEFAULT_NAMES[index] ?? `Folder ${index + 1}`}
					onChange={(e) => patch({ name: e.target.value })}
					style={textInputStyle}
				/>
			</div>
			<NumberField
				label="Drafts"
				value={folder.draftCount ?? 0}
				onChange={(n) => patch({ draftCount: n })}
			/>
			<NumberField
				label="Sent"
				value={folder.sentCount ?? 0}
				onChange={(n) => patch({ sentCount: n })}
			/>
			<NumberField
				label="Updated (days ago)"
				value={folder.updatedDaysAgo ?? 0}
				onChange={(n) => patch({ updatedDaysAgo: n })}
			/>
			<NumberField
				label="New Emails"
				value={folder.newEmailCount ?? 0}
				onChange={(n) => patch({ newEmailCount: n })}
			/>
		</div>
	);
};

export const CampaignsTableDebugPanel: FC<Props> = ({ value, onChange }) => {
	const [collapsed, setCollapsed] = useState(false);

	const initialFolders = value?.folders?.length
		? value.folders.slice(0, MAX_FOLDERS)
		: [blankFolder(0)];
	const [folders, setFolders] = useState<CampaignsMockFolder[]>(initialFolders);

	const overrideActive = value != null;
	const folderCount = folders.length;

	useEffect(() => {
		// Auto-enable override on any field edit so the panel feels "live".
		onChange(buildState(folders));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [folders]);

	const setFolderAt = (index: number, next: CampaignsMockFolder) => {
		setFolders((prev) => {
			const copy = prev.slice();
			copy[index] = next;
			return copy;
		});
	};

	const setFolderCount = (n: number) => {
		const clamped = Math.max(1, Math.min(MAX_FOLDERS, n));
		setFolders((prev) => {
			if (clamped === prev.length) return prev;
			if (clamped > prev.length) {
				const next = prev.slice();
				for (let i = prev.length; i < clamped; i++) next.push(blankFolder(i));
				return next;
			}
			return prev.slice(0, clamped);
		});
	};

	const reset = () => {
		setFolders([blankFolder(0)]);
		onChange(undefined);
	};

	return (
		<div
			style={{
				position: 'fixed',
				top: 80,
				right: 16,
				width: collapsed ? 'auto' : 320,
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
					Campaigns Debug{overrideActive ? '' : ' (off)'}
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
					<div style={{ marginTop: 12 }}>
						<NumberField
							label={`Folders (${folderCount}/${MAX_FOLDERS})`}
							value={folderCount}
							onChange={setFolderCount}
						/>
					</div>

					<hr
						style={{ margin: '10px 0', border: 0, borderTop: '1px solid #eee' }}
					/>

					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{folders.map((folder, index) => (
							<FolderCard
								key={`folder-${index}`}
								index={index}
								folder={folder}
								onChange={(next) => setFolderAt(index, next)}
							/>
						))}
					</div>

					<hr
						style={{ margin: '12px 0', border: 0, borderTop: '1px solid #eee' }}
					/>

					<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
						{!overrideActive ? (
							<button
								type="button"
								style={{ ...buttonStyle, background: '#E0F0FF' }}
								onClick={() => onChange(buildState(folders))}
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
						Drafts/Sent feed the metric pills. Updated controls the Updated
						column color + label ("Today" at 0, then mm.dd). New Emails is
						stored on the row for upcoming UI.
					</div>
				</>
			)}
		</div>
	);
};

export default CampaignsTableDebugPanel;
