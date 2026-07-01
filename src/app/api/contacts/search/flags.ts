// Rollout flags for the free-text search overhaul. Read at call time (the
// repo's USE_WASM_* convention) so a Vercel env flip + redeploy is an instant
// revert with no code change.
//
// Dependency ladder (enforced here, not by deploy discipline):
//   SEARCH_LLM_INTENT        — resolve + log query intent (shadow mode only).
//   SEARCH_RANKING_V2        — consume intent: conditioned tables/boosts,
//                              structured lexical, org retriever, blended geo,
//                              evidence gate. Requires SEARCH_LLM_INTENT.
//   UNIFIED_FREE_TEXT_SEARCH — legacy /api/contacts delegation to the engine.
//                              Requires BOTH above: delegating to the
//                              intent-off engine would geo-strangle hero
//                              queries down to ≤18 results — worse than the
//                              legacy path it replaces.
// There is deliberately NO intent-consumed-but-legacy-geo intermediate state
// (the org retriever's national rows would be deleted by the 250km drop, and
// removing the person hard-drop without the evidence gate fills data-void
// queries with kNN junk).

const flagOn = (value: string | undefined): boolean =>
	value === '1' || value === 'true';

export const isSearchLlmIntentEnabled = (): boolean =>
	flagOn(process.env.SEARCH_LLM_INTENT);

export const isSearchRankingV2Enabled = (): boolean =>
	isSearchLlmIntentEnabled() && flagOn(process.env.SEARCH_RANKING_V2);

export const isUnifiedFreeTextSearchEnabled = (): boolean =>
	isSearchRankingV2Enabled() && flagOn(process.env.UNIFIED_FREE_TEXT_SEARCH);
