'use client';

import {
	createContext,
	type Dispatch,
	type FC,
	type MutableRefObject,
	type ReactNode,
	type SetStateAction,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from 'react';

import type { CampaignWithRelations } from '@/types';

export interface DashboardDraftingStatus {
	isDrafting: boolean;
	activeContactId: number | null;
	completedContactIds: number[];
	total: number;
}

export const IDLE_DASHBOARD_DRAFTING_STATUS: DashboardDraftingStatus = {
	isDrafting: false,
	activeContactId: null,
	completedContactIds: [],
	total: 0,
};

export interface DashboardDraftingPlacement {
	top: string;
	right: number;
	zIndex?: number;
}

export interface DashboardDraftingSession {
	campaign: CampaignWithRelations;
	targetContactIds: number[];
	isVisible: boolean;
	placement: DashboardDraftingPlacement | null;
}

export interface DashboardDraftingSessionInput {
	campaign: CampaignWithRelations;
	targetContactIds: number[];
	isVisible?: boolean;
	placement?: DashboardDraftingPlacement | null;
}

export interface DashboardDraftingSessionUpdate {
	campaign?: CampaignWithRelations;
	targetContactIds?: number[];
	isVisible?: boolean;
	placement?: DashboardDraftingPlacement | null;
}

export interface DashboardDraftingDashboardHandlers {
	onClose?: () => void;
	onSwitchToAddToFolder?: () => void;
	onViewDrafting?: () => void;
}

interface DashboardDraftingSessionContextValue {
	session: DashboardDraftingSession | null;
	status: DashboardDraftingStatus;
	isReviewActive: boolean;
	activeReviewContactId: number | null;
	isDraftingDeckCollapsed: boolean;
	dashboardHandlersRef: MutableRefObject<DashboardDraftingDashboardHandlers>;
	openOrUpdateSession: (input: DashboardDraftingSessionInput) => void;
	updateSession: (update: DashboardDraftingSessionUpdate) => void;
	closeSession: () => void;
	setStatus: (status: DashboardDraftingStatus) => void;
	setReviewActive: (active: boolean) => void;
	setActiveReviewContactId: (contactId: number | null) => void;
	setDraftingDeckCollapsed: Dispatch<SetStateAction<boolean>>;
	registerDashboardHandlers: (handlers: DashboardDraftingDashboardHandlers) => () => void;
}

const DashboardDraftingSessionContext =
	createContext<DashboardDraftingSessionContextValue | null>(null);

const sameNumberArray = (a: number[], b: number[]) =>
	a.length === b.length && a.every((value, index) => value === b[index]);

export const DashboardDraftingSessionProvider: FC<{ children: ReactNode }> = ({
	children,
}) => {
	const [session, setSession] = useState<DashboardDraftingSession | null>(null);
	const [status, setStatus] = useState<DashboardDraftingStatus>(
		IDLE_DASHBOARD_DRAFTING_STATUS
	);
	const [isReviewActive, setReviewActive] = useState(false);
	const [activeReviewContactId, setActiveReviewContactId] = useState<number | null>(
		null
	);
	const [isDraftingDeckCollapsed, setDraftingDeckCollapsed] = useState(false);
	const dashboardHandlersRef = useRef<DashboardDraftingDashboardHandlers>({});

	const openOrUpdateSession = useCallback((input: DashboardDraftingSessionInput) => {
		setSession((current) => {
			const next: DashboardDraftingSession = {
				campaign: input.campaign,
				targetContactIds: input.targetContactIds,
				isVisible: input.isVisible ?? current?.isVisible ?? true,
				placement: input.placement ?? current?.placement ?? null,
			};

			if (
				current &&
				current.campaign === next.campaign &&
				current.isVisible === next.isVisible &&
				current.placement === next.placement &&
				sameNumberArray(current.targetContactIds, next.targetContactIds)
			) {
				return current;
			}

			return next;
		});
	}, []);

	const updateSession = useCallback((update: DashboardDraftingSessionUpdate) => {
		setSession((current) => {
			if (!current) return current;
			const next: DashboardDraftingSession = {
				campaign: update.campaign ?? current.campaign,
				targetContactIds: update.targetContactIds ?? current.targetContactIds,
				isVisible: update.isVisible ?? current.isVisible,
				placement:
					Object.prototype.hasOwnProperty.call(update, 'placement')
						? (update.placement ?? null)
						: current.placement,
			};

			if (
				current.campaign === next.campaign &&
				current.isVisible === next.isVisible &&
				current.placement === next.placement &&
				sameNumberArray(current.targetContactIds, next.targetContactIds)
			) {
				return current;
			}

			return next;
		});
	}, []);

	const closeSession = useCallback(() => {
		setSession(null);
		setStatus(IDLE_DASHBOARD_DRAFTING_STATUS);
		setReviewActive(false);
		setActiveReviewContactId(null);
		setDraftingDeckCollapsed(false);
	}, []);

	const registerDashboardHandlers = useCallback(
		(handlers: DashboardDraftingDashboardHandlers) => {
			dashboardHandlersRef.current = handlers;
			return () => {
				if (dashboardHandlersRef.current === handlers) {
					dashboardHandlersRef.current = {};
				}
			};
		},
		[]
	);

	const value = useMemo<DashboardDraftingSessionContextValue>(
		() => ({
			session,
			status,
			isReviewActive,
			activeReviewContactId,
			isDraftingDeckCollapsed,
			dashboardHandlersRef,
			openOrUpdateSession,
			updateSession,
			closeSession,
			setStatus,
			setReviewActive,
			setActiveReviewContactId,
			setDraftingDeckCollapsed,
			registerDashboardHandlers,
		}),
		[
			session,
			status,
			isReviewActive,
			activeReviewContactId,
			isDraftingDeckCollapsed,
			openOrUpdateSession,
			updateSession,
			closeSession,
			registerDashboardHandlers,
		]
	);

	return (
		<DashboardDraftingSessionContext.Provider value={value}>
			{children}
		</DashboardDraftingSessionContext.Provider>
	);
};

export const useDashboardDraftingSession = () => {
	const value = useContext(DashboardDraftingSessionContext);
	if (!value) {
		throw new Error(
			'useDashboardDraftingSession must be used within DashboardDraftingSessionProvider'
		);
	}
	return value;
};
