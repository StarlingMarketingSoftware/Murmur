// Route-segment fallback while the campaign page chunk/data resolve. The shared
// /murmur layout keeps the persistent Mapbox map mounted behind this, so the bare
// map (already easing toward the campaign framing) is what the user sees during the
// handoff — no visible loading indicator. The campaign page runs its own staged
// reveal once it mounts. Kept as an empty boundary so navigation still commits
// instantly instead of blocking on the route payload.
export default function CampaignLoading() {
	return (
		<main
			aria-busy="true"
			aria-label="Loading campaign"
			className="min-h-screen pointer-events-none"
			style={{ background: 'transparent' }}
		/>
	);
}
