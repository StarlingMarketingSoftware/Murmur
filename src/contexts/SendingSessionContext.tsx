'use client';

import {
	createContext,
	type FC,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from 'react';
import { ContactWithName } from '@/types/contact';

/**
 * Campaign-global "actively sending" session state.
 *
 * The sequential send loops (useDraftReviewHandlers.handleSendDrafts,
 * DraftsExpandedList.handleSendSelected, useConfirmSendDialog.handleSend) drive this
 * state while they process a batch; the sending UI (left panel sending list, draft
 * review green chrome, campaign header send-queue pill, search-tab sending overlay)
 * reads it. The provider is mounted on the campaign page only — consumers rendered
 * outside it (e.g. the dashboard draft review) get an idle state and no-op actions.
 */

export type SendingLogLine = { ts: number; text: string };

export type SendingItemKind = 'email' | 'venueMessage';

export type SendingItemStatus = 'queued' | 'sending' | 'sent' | 'failed';

export type SendingQueueItem = {
	emailId: number;
	contactId: number;
	contact: ContactWithName;
	kind: SendingItemKind;
	subject: string | null;
	status: SendingItemStatus;
	logLines: SendingLogLine[];
	startedAt: number | null;
	/** 0..1 scripted step progress for the active card's thin progress bar. */
	progress: number;
};

export type SendingSessionStatus = 'idle' | 'sending' | 'done';

export type SendingSessionState = {
	sessionId: number;
	status: SendingSessionStatus;
	campaignId: number | null;
	queue: SendingQueueItem[];
	total: number;
	sentCount: number;
	failedCount: number;
	activeIndex: number;
	dismissed: boolean;
};

export type SendingSessionQueueInput = Pick<
	SendingQueueItem,
	'emailId' | 'contactId' | 'contact' | 'kind' | 'subject'
>;

export type SendingSessionActions = {
	/** False outside the provider — used to skip the per-email display dwell. */
	hasProvider: boolean;
	/** Returns false (and does nothing) when a session is already sending. */
	startSession: (args: {
		campaignId: number;
		queue: SendingSessionQueueInput[];
	}) => boolean;
	beginEmail: (emailId: number) => void;
	completeEmail: (emailId: number) => void;
	failEmail: (emailId: number) => void;
	finishSession: () => void;
	dismiss: () => void;
	reset: () => void;
};

const INITIAL_STATE: SendingSessionState = {
	sessionId: 0,
	status: 'idle',
	campaignId: null,
	queue: [],
	total: 0,
	sentCount: 0,
	failedCount: 0,
	activeIndex: -1,
	dismissed: false,
};

const NOOP_ACTIONS: SendingSessionActions = {
	hasProvider: false,
	// Outside the provider there is never a conflicting session — report success
	// so send loops proceed normally (their session UI calls are no-ops).
	startSession: () => true,
	beginEmail: () => {},
	completeEmail: () => {},
	failEmail: () => {},
	finishSession: () => {},
	dismiss: () => {},
	reset: () => {},
};

const MAX_LOG_LINES_PER_ITEM = 20;
const LOG_TICK_BASE_MS = 220;
const LOG_TICK_JITTER_MS = 60;
const DONE_RESET_DELAY_MS = 1400;

type SendingSessionAction =
	| {
			type: 'start';
			campaignId: number;
			queue: SendingSessionQueueInput[];
	  }
	| { type: 'begin'; emailId: number; ts: number; line: string }
	| { type: 'appendLog'; emailId: number; line: SendingLogLine; progress: number }
	| { type: 'complete'; emailId: number; line: SendingLogLine }
	| { type: 'fail'; emailId: number; line: SendingLogLine }
	| { type: 'finish' }
	| { type: 'dismiss' }
	| { type: 'reset' };

const appendLine = (
	logLines: SendingLogLine[],
	line: SendingLogLine
): SendingLogLine[] => [...logLines, line].slice(-MAX_LOG_LINES_PER_ITEM);

const sendingSessionReducer = (
	state: SendingSessionState,
	action: SendingSessionAction
): SendingSessionState => {
	switch (action.type) {
		case 'start':
			return {
				sessionId: state.sessionId + 1,
				status: 'sending',
				campaignId: action.campaignId,
				queue: action.queue.map((item) => ({
					...item,
					status: 'queued',
					logLines: [],
					startedAt: null,
					progress: 0,
				})),
				total: action.queue.length,
				sentCount: 0,
				failedCount: 0,
				activeIndex: -1,
				dismissed: false,
			};
		case 'begin': {
			const index = state.queue.findIndex((item) => item.emailId === action.emailId);
			if (index === -1) return state;
			return {
				...state,
				activeIndex: index,
				queue: state.queue.map((item) =>
					item.emailId === action.emailId
						? {
								...item,
								status: 'sending',
								startedAt: action.ts,
								logLines: appendLine(item.logLines, {
									ts: action.ts,
									text: action.line,
								}),
							}
						: item
				),
			};
		}
		case 'appendLog':
			return {
				...state,
				queue: state.queue.map((item) =>
					item.emailId === action.emailId
						? {
								...item,
								logLines: appendLine(item.logLines, action.line),
								progress: action.progress,
							}
						: item
				),
			};
		case 'complete':
		case 'fail': {
			const didSend = action.type === 'complete';
			return {
				...state,
				sentCount: didSend ? state.sentCount + 1 : state.sentCount,
				failedCount: didSend ? state.failedCount : state.failedCount + 1,
				queue: state.queue.map((item) =>
					item.emailId === action.emailId
						? {
								...item,
								status: didSend ? 'sent' : 'failed',
								logLines: appendLine(item.logLines, action.line),
								progress: 1,
							}
						: item
				),
			};
		}
		case 'finish':
			if (state.status !== 'sending') return state;
			return { ...state, status: 'done' };
		case 'dismiss':
			return { ...state, dismissed: true };
		case 'reset':
			return { ...INITIAL_STATE, sessionId: state.sessionId };
		default:
			return state;
	}
};

const buildLogScript = (item: {
	kind: SendingItemKind;
	recipientEmail?: string | null;
}): string[] => [
	'booting murmur send engine...',
	'mounting campaign workspace...',
	item.kind === 'venueMessage'
		? 'resolving recipient (direct message)...'
		: `resolving recipient ${item.recipientEmail || ''}...`.replace('  ', ' '),
	'composing payload...',
	item.kind === 'venueMessage'
		? 'routing as internal venue message...'
		: 'dispatching via mailgun...',
];

const SendingSessionStateContext = createContext<SendingSessionState>(INITIAL_STATE);
const SendingSessionActionsContext = createContext<SendingSessionActions>(NOOP_ACTIONS);

export const SendingSessionProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const [state, dispatch] = useReducer(sendingSessionReducer, INITIAL_STATE);

	// Synchronous mirrors so the async send loops never race a stale render.
	const statusRef = useRef<SendingSessionStatus>('idle');
	const queueMetaRef = useRef<
		Map<number, { kind: SendingItemKind; recipientEmail: string | null }>
	>(new Map());
	const tickerRef = useRef<{ emailId: number; timer: ReturnType<typeof setTimeout> } | null>(
		null
	);
	const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const actions = useMemo<SendingSessionActions>(() => {
		const clearTicker = () => {
			if (tickerRef.current) {
				clearTimeout(tickerRef.current.timer);
				tickerRef.current = null;
			}
		};
		const clearResetTimer = () => {
			if (resetTimerRef.current) {
				clearTimeout(resetTimerRef.current);
				resetTimerRef.current = null;
			}
		};

		const startSession: SendingSessionActions['startSession'] = ({
			campaignId,
			queue,
		}) => {
			if (statusRef.current === 'sending') return false;
			clearTicker();
			clearResetTimer();
			statusRef.current = 'sending';
			queueMetaRef.current = new Map(
				queue.map((item) => [
					item.emailId,
					{ kind: item.kind, recipientEmail: item.contact?.email ?? null },
				])
			);
			dispatch({ type: 'start', campaignId, queue });
			return true;
		};

		const beginEmail: SendingSessionActions['beginEmail'] = (emailId) => {
			clearTicker();
			const meta = queueMetaRef.current.get(emailId) ?? {
				kind: 'email' as const,
				recipientEmail: null,
			};
			const script = buildLogScript(meta);
			dispatch({ type: 'begin', emailId, ts: Date.now(), line: script[0] });
			// Steps after the first stream in on a jittered timer; the final
			// "delivered." step is reserved for completeEmail, so progress tops out
			// just below 1 until the real send resolves.
			let step = 1;
			const scheduleNext = () => {
				const delay = LOG_TICK_BASE_MS + (Math.random() * 2 - 1) * LOG_TICK_JITTER_MS;
				const timer = setTimeout(() => {
					if (step >= script.length) {
						tickerRef.current = null;
						return;
					}
					dispatch({
						type: 'appendLog',
						emailId,
						line: { ts: Date.now(), text: script[step] },
						progress: (step + 1) / (script.length + 1),
					});
					step += 1;
					scheduleNext();
				}, delay);
				tickerRef.current = { emailId, timer };
			};
			scheduleNext();
		};

		const stopTickerFor = (emailId: number) => {
			if (tickerRef.current?.emailId === emailId) clearTicker();
		};

		const completeEmail: SendingSessionActions['completeEmail'] = (emailId) => {
			stopTickerFor(emailId);
			dispatch({
				type: 'complete',
				emailId,
				line: { ts: Date.now(), text: 'delivered.' },
			});
		};

		const failEmail: SendingSessionActions['failEmail'] = (emailId) => {
			stopTickerFor(emailId);
			dispatch({
				type: 'fail',
				emailId,
				line: { ts: Date.now(), text: 'send failed — continuing batch...' },
			});
		};

		const finishSession: SendingSessionActions['finishSession'] = () => {
			if (statusRef.current !== 'sending') return;
			clearTicker();
			statusRef.current = 'done';
			dispatch({ type: 'finish' });
			clearResetTimer();
			resetTimerRef.current = setTimeout(() => {
				resetTimerRef.current = null;
				statusRef.current = 'idle';
				dispatch({ type: 'reset' });
			}, DONE_RESET_DELAY_MS);
		};

		const dismiss: SendingSessionActions['dismiss'] = () => {
			dispatch({ type: 'dismiss' });
		};

		const reset: SendingSessionActions['reset'] = () => {
			clearTicker();
			clearResetTimer();
			statusRef.current = 'idle';
			dispatch({ type: 'reset' });
		};

		return {
			hasProvider: true,
			startSession,
			beginEmail,
			completeEmail,
			failEmail,
			finishSession,
			dismiss,
			reset,
		};
	}, []);

	useEffect(() => {
		return () => {
			if (tickerRef.current) clearTimeout(tickerRef.current.timer);
			if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
		};
	}, []);

	return (
		<SendingSessionStateContext.Provider value={state}>
			<SendingSessionActionsContext.Provider value={actions}>
				{children}
			</SendingSessionActionsContext.Provider>
		</SendingSessionStateContext.Provider>
	);
};

export const useSendingSessionState = (): SendingSessionState =>
	useContext(SendingSessionStateContext);

export const useSendingSessionActions = (): SendingSessionActions =>
	useContext(SendingSessionActionsContext);

/**
 * Minimum on-screen dwell per email so the sending animation stays legible —
 * it runs concurrently with the real send, so it only pads sends that resolve
 * faster than the dwell.
 */
export const getSendDwellMs = (total: number): number => {
	if (total <= 15) return 1200;
	if (total <= 40) return 700;
	return 350;
};

/** Awaits whatever is left of the dwell window started at `t0`. */
export const waitForSendDwell = (t0: number, dwellMs: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, Math.max(0, dwellMs - (Date.now() - t0))));

/** "[03:14:02.118]" — terminal-style timestamp for the sending log lines. */
export const formatLogTimestamp = (ts: number): string => {
	const d = new Date(ts);
	const pad = (n: number, width = 2) => String(n).padStart(width, '0');
	return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(
		d.getMilliseconds(),
		3
	)}]`;
};

/** "9:12am" — header timestamp for a sending contact card. */
export const formatSendStartedAt = (ts: number): string => {
	const d = new Date(ts);
	const hours = d.getHours() % 12 || 12;
	const minutes = String(d.getMinutes()).padStart(2, '0');
	return `${hours}:${minutes}${d.getHours() >= 12 ? 'pm' : 'am'}`;
};
