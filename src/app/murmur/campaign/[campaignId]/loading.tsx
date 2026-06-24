export default function CampaignLoading() {
	return (
		<main
			aria-busy="true"
			aria-label="Loading campaign"
			className="min-h-screen pointer-events-none"
			style={{ background: 'transparent' }}
		>
			<div
				style={{
					position: 'fixed',
					top: 16,
					right: 24,
					zIndex: 30,
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					border: '1px solid rgba(0, 0, 0, 0.18)',
					borderRadius: 999,
					background: 'rgba(255, 255, 255, 0.78)',
					padding: '6px 12px',
					fontSize: 13,
					fontWeight: 600,
					color: '#111827',
					boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
					backdropFilter: 'blur(8px)',
				}}
			>
				<span
					aria-hidden="true"
					style={{
						width: 8,
						height: 8,
						borderRadius: 999,
						background: '#22c55e',
					}}
				/>
				<span>Loading campaign…</span>
			</div>
		</main>
	);
}
