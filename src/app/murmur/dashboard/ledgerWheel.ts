// Pure, DOM-free decision helpers for the Selection⇄Search Results "ledger" wheel
// arbiter in DashboardPageClient. The arbiter itself must read live DOM (scroll
// positions, element rects) and perform side effects (scrollTop writes, CSS-var
// divider writes), but every *decision* it makes is factored out here so the tricky
// parts — the terminal/fall-through rule, the static-cursor latch, the seam
// resolution, and the wheel-delta split — can be unit-tested without a browser.
//
// Background: the side panel stacks Selection (top) over Search Results (bottom).
// A wheel sample is spent on exactly ONE motion of the latched box: first resize it
// toward its open limit, then — once open — scroll its rows. These helpers encode
// which motion happens and, crucially, what to do at the ends so the panel never
// "bugs out" (reverses the divider) at a terminal or flips region under a static
// cursor.

export type LedgerRegion = 'selection' | 'results';

// Outcome of spending one wheel sample on a region. The distinction between
// `exhausted` and `blocked` is what fixes the "keep scrolling at the end" bug:
//   • moved     — the sample moved the divider or scrolled content.
//   • settling  — consumed while the eased divider visually catches up (absorb).
//   • exhausted — the box is fully open AND its rows are at the boundary in this
//                 direction: a genuine terminal. Absorb the sample; do NOT hand it
//                 to the other box (handing it over would reverse the divider — the
//                 jarring jump the user sees at the end of a scroll).
//   • blocked   — the box could not act from a NON-terminal state (a dead zone: it
//                 has nothing to reveal/scroll in this direction). Only here should
//                 the sample fall through to the other box, so a short list never
//                 leaves the wheel dead.
export type LedgerSpendResult = 'moved' | 'settling' | 'exhausted' | 'blocked';

// Clamp for a single wheel sample applied to the DIVIDER resize. Large enough that a
// normal mouse notch (~100px) passes through unclamped so the divider tracks the
// cursor 1:1 and feels native, but still caps a pathological inertial "fling" sample
// so it can't slam the divider across the whole range in one frame. (Content scroll
// is intentionally NOT clamped — see normalizeWheelDeltaPx callers — so in-list
// scrolling matches the browser's native speed.)
export const LEDGER_MAX_STEP_PX = 120;

// Below this |delta| a wheel sample is treated as noise (prevents twitch from
// sub-pixel trackpad jitter).
export const LEDGER_WHEEL_DEADZONE_PX = 1;

// The pointer must physically move more than this many pixels between two wheel
// samples for an idle gap to RE-TARGET the latched region. A perfectly (or nearly)
// static cursor keeps whatever region it first latched, so the divider sliding under
// a stationary pointer can never flip the active region mid-scroll — this is the fix
// for the seam "twitch/stutter" the user hit when the cursor sat over both boxes.
export const LEDGER_POINTER_MOVE_EPS_PX = 3;

// Convert a raw WheelEvent delta into pixels, normalizing the line/page delta modes
// some mice/OSes emit so every downstream calculation is in one unit.
//   deltaMode 0 = pixels, 1 = lines (~16px/line), 2 = pages (~one panel height).
export function normalizeWheelDeltaPx(
	deltaY: number,
	deltaMode: number,
	pageHeightPx: number
): number {
	if (deltaMode === 1) return deltaY * 16;
	if (deltaMode === 2) return deltaY * (pageHeightPx > 0 ? pageHeightPx : 400);
	return deltaY;
}

// Clamp a normalized wheel delta for use on the divider resize (sign preserved).
export function clampLedgerResizeDelta(deltaPx: number): number {
	if (deltaPx > LEDGER_MAX_STEP_PX) return LEDGER_MAX_STEP_PX;
	if (deltaPx < -LEDGER_MAX_STEP_PX) return -LEDGER_MAX_STEP_PX;
	return deltaPx;
}

// Whether a sample should fall through to the OTHER box. Only a dead-zone `blocked`
// falls through; `moved`/`settling`/`exhausted` are all absorbed by the primary box
// so a reached terminal never reverses the divider into the secondary box.
export function shouldFallThroughToSecondary(
	primary: LedgerSpendResult
): boolean {
	return primary === 'blocked';
}

// Whether the next wheel sample should re-resolve the active region from the pointer
// rather than keep the currently latched one. Re-target when there is no latch yet,
// or when the gesture has gone idle AND the pointer has actually moved to a new spot.
// A static cursor across an idle gap keeps its latch (no re-target) so the moving
// divider can't flip the region under it.
export function shouldRetargetLedgerRegion(args: {
	hasLatch: boolean;
	idle: boolean;
	pointerMoved: boolean;
}): boolean {
	if (!args.hasLatch) return true;
	return args.idle && args.pointerMoved;
}

// Resolve which box a wheel sample belongs to from the pointer's vertical position.
// Above the Selection box's bottom → Selection; below the Results box's top →
// Results. In the seam/gap BETWEEN them the two halves would resize the divider in
// opposite directions for the same scroll, so instead of a sub-pixel nearest-edge
// split (which flips on a 1px cursor move) we read the whole panel as one continuous
// ledger: scrolling down targets the lower box (Results), up targets the upper box
// (Selection).
export function resolveLedgerRegionFromGeometry(args: {
	clientY: number;
	selectionBottom: number;
	resultsTop: number;
	deltaSign: number;
}): LedgerRegion {
	if (args.clientY <= args.selectionBottom) return 'selection';
	if (args.clientY >= args.resultsTop) return 'results';
	return args.deltaSign > 0 ? 'results' : 'selection';
}

// Classify a FORWARD (scroll-down) sample AFTER the box is fully open (its divider is
// pinned at this region's grow limit) and we have tried to scroll its rows.
//   • rows moved            → `moved`.
//   • rows could not move    → `exhausted`: the box already consumed the grow phase,
//     so the divider is committed to it; a further down-sample has nowhere to go.
//     It is ABSORBED rather than handed to the other box, because handing a
//     forward-terminal sample over would grow the other box and REVERSE the divider
//     the user just moved — precisely the "bugs when I get to the end and keep
//     scrolling" jump. (Whether the list overflowed or was simply short, the outcome
//     at a fully-open box is the same: nothing below to reveal.)
// Phase-1 dead zones — where the box cannot even grow from rest because it has
// nothing hidden — are classified `blocked` by the caller (not here), so short lists
// still fall through and never leave the wheel dead.
export function forwardTerminalResult(contentScrolled: boolean): LedgerSpendResult {
	return contentScrolled ? 'moved' : 'exhausted';
}

// ── Directional terminal latch ───────────────────────────────────────────────
// A gesture that has driven the ledger fully to a stop in one direction should
// hard-absorb every FURTHER same-direction sample until the user reverses, moves the
// cursor to a new ledger region, or the ledger content/split is reset. Re-running the
// resize/scroll/fall-through decision every wheel notch at the boundary (including
// discrete mouse-wheel notches spaced farther apart than the gesture idle window) is
// what let the divider bounce by ±epsilon — the flicker the user still sees when they
// "keep scrolling past the end". The latch is stored as a sign:
//   0 = not latched, +1 = bottomed out scrolling down, -1 = topped out scrolling up.
export type LedgerTerminalLatch = 0 | 1 | -1;

// Should the current sample be absorbed WITHOUT running the arbiter? True only when
// the latch is armed in the same direction as this sample.
export function isLatchedInDirection(
	latch: LedgerTerminalLatch,
	deltaSign: number
): boolean {
	if (latch === 0) return false;
	const dir = deltaSign > 0 ? 1 : -1;
	return latch === dir;
}

// Next latch value after processing one sample. Precedence, in order:
//   1) A sample opposite the armed latch clears it (reversing is always instant).
//   2) Any real movement clears a stale latch (live content/split can move again).
//   3) If the whole panel could move nothing for this sample, arm the latch in this
//      direction (we've hit a true terminal — silence the momentum tail).
//
// `idle` is intentionally NOT a clear signal by itself. A physical mouse wheel often
// spaces notches farther apart than the idle timeout, and clearing the terminal latch
// on every notch was the remaining bottom-flicker path: each new notch re-ran the
// boundary resize/fall-through logic and could twitch the divider. Callers should
// clear the latch on actual content/split changes, pointer re-targets, or reversal.
export function nextTerminalLatch(args: {
	current: LedgerTerminalLatch;
	deltaSign: number;
	idle: boolean;
	anythingMoved: boolean;
}): LedgerTerminalLatch {
	const dir: 1 | -1 = args.deltaSign > 0 ? 1 : -1;
	if (args.current === -dir) return 0;
	return args.anythingMoved ? 0 : dir;
}
