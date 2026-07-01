# SearchResultsMap — split move map

`SearchResultsMap.tsx` was ~23,900 lines; it has been mechanically split (verbatim
moves, zero intended behavior change) into the sibling files below. The shell keeps:
the public exports (default memoized component, `SearchResultsMapProps` re-export,
status-type re-exports, the `DASHBOARD_TO_INTERACTIVE_TRANSITION_*` re-export,
`mapboxgl.prewarm()`), the shared mutable ref spine, render-phase prop mirrors, the
transient-overlay reset + new-search stale clear (cross-cutting teardowns),
`syncInteractiveFloor` + `reapplyFloorShiftedAnchors` (parity orchestrator),
`recomputeViewportDots` (coupling hub), map construction / boot ladder /
presentation-scrub core, the pointer-interactions effect, and JSX composition.

Rules if you edit here (from the split safety rulebook):
- Hooks are called at the exact position their code occupied — do not reorder calls.
- Deps arrays in moved code are intentional (ref-vs-dep gates animation re-fires);
  do not "fix" exhaustive-deps warnings.
- Render-phase `ref.current =` writes (incl. the `apply*Ref.current = fn` publishes
  inside hooks) must stay render-phase.
- New files are NOT exempt from `no-use-before-define` (the shell is).

| What | File |
|---|---|
| Perf flags (IS_SAFARI, CANVAS_PERF_MODE) | `perfFlags.ts` |
| Zoom/pan feel helpers, right-click consts, street pitch fn | `mapInputFeel.ts` |
| Status marker styles + exported status types | `markerStatusStyles.ts` |
| Owned-venue/event radar builders, MapEvent type, popup consts | `radarOverlays.ts` |
| Selection action card layout consts | `selectionActionsLayout.ts` |
| Pure tooltip placement/stacking engines + types | `selectedTooltipLayout.ts` |
| Ambient overlay fetch types, camera-scrub event | `ambientOverlayShared.ts` |
| Compact pill primitives | `compactOverlayPillPrimitives.ts` |
| SearchResultsMapProps interface | `searchResultsMapProps.ts` |
| Source+layer registration (deps-[] wrapper stays in shell) | `ensureMapboxSourcesAndLayers.ts` |
| Camera padding (the singleton setPadding site) | `useCameraPadding.ts` |
| Owned-venue radar sources/pulse/anchor | `useOwnedVenueRadar.ts` |
| Events radar (verbatim twin — keep separate) | `useEventsRadar.ts` |
| Basemap overview prewarm | `useBasemapPrewarm.ts` |
| Right-click / Shift+Arrow affordances | `useMapInputAffordances.ts` |
| Booking/promotion/all-contacts fetch pipeline | `useContactOverlayFetching.ts` |
| Campaign footprint constellation | `useCampaignFootprint.ts` |
| Campaign selection heatmap | `useCampaignHeatmap.ts` |
| Radius pin + placement mode | `useRadiusSearchTool.ts` |
| Area-select completion + All-in-view | `useAreaSelectCompletion.ts` |
| Clouds/lightning/snow canvas subsystem (ONE effect) | `useWeatherCanvasAnimation.ts` |
| Lighting appliers + drivers | `useLightingAppliers.ts`, `useLightingDrivers.ts` |
| Mood applier + transitions | `useApplyWeatherMoodConfig.ts`, `useWeatherMoodTransitions.ts` |
| Marker image rasterization/assets | `useMapMarkerImages.ts` |
| All-contacts/promotion/booking overlay sources | `useOverlayMarkerSources.ts` |
| Base dots: wave control/source/filter/reveal | `useBaseResultDots.ts` |
| Constellation: controls/writer/dim-sync/composer | `useMarkerConstellation.ts` |
| Selected-marker halo artwork | `useSelectedMarkerArtwork.ts` |
| Curated blob builder/orb/morph binding | `useCuratedBlob.ts` |
| Selected-state gradient | `useSelectedStateGradient.ts` |
| Lighting overlay divs (JSX) | `MapLightingOverlays.tsx` |
| State wash / orb SVGs (JSX) | `SelectedStateGradientSvg.tsx`, `CuratedOrbSvg.tsx` |
| Research panel / event popup / action card (JSX) | `SelectedMarkerResearchPanel.tsx`, `MapEventPopup.tsx`, `MapSelectionActionCard.tsx` |

Not yet extracted (planned, needs pixel-level visual verification — see
`~/.claude/plans/can-we-look-deeply-peppy-sprout.md`): the coupled selected-tooltip
stacks / hover tooltip / street cards / compact-pill JSX unit (pass 11b) and the
camera followers (street pitch, drag tuning, auto-fit, requested zoom, viewport
settle — pass 12).
