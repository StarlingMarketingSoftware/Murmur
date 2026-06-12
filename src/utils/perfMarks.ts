// Inert performance.mark instrumentation for the campaign ⇄ dashboard-search tab
// switch. Marks cost nothing user-visible and stay in production builds;
// scripts/measure-tab-switch.mjs reads them to time click → first-results-paint.

export const markPerf = (name: string): void => {
	if (typeof performance === 'undefined') return;
	try {
		performance.mark(name);
	} catch {
		// performance API unavailable/restricted — instrumentation is best-effort.
	}
};

// Mark after the next paint (double rAF). When `measureFrom` exists as a mark, record a
// performance.measure from it and consume the start mark so a later unrelated paint
// (e.g. an in-page tab switch) can't measure against a stale click.
export const markAfterPaint = (name: string, measureFrom?: string): void => {
	if (typeof window === 'undefined' || typeof performance === 'undefined') return;
	window.requestAnimationFrame(() => {
		window.requestAnimationFrame(() => {
			try {
				performance.mark(name);
				if (
					measureFrom &&
					performance.getEntriesByName(measureFrom, 'mark').length > 0
				) {
					performance.measure(`${measureFrom}->${name}`, measureFrom, name);
					performance.clearMarks(measureFrom);
				}
			} catch {
				// best-effort
			}
		});
	});
};
