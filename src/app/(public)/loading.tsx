/**
 * Loading fallback for the public route group.
 *
 * Renders the same light gradient used by the home and pricing pages so
 * client-side navigations (e.g. home ↔ pricing) stay visually continuous —
 * the background holds steady and only the content swaps, instead of flashing
 * a mismatched skeleton in between.
 */
export default function PublicLoading() {
	return (
		<main
			className="min-h-screen w-full"
			style={{ background: 'linear-gradient(180deg, #FFF 0%, #FFF 50%, #D5F1FF 100%)' }}
		/>
	);
}
