'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { Play, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { MapStackStarIcon } from '@/components/atoms/_svg/MapStackStarIcon';
import { normalizeInlineSvgMarkupForXml } from '@/components/atoms/_svg/MapTooltipIcon';
import { getTooltipCategoryIconSpec } from '@/components/atoms/_svg/mapTooltipCategoryIcons';
import { ProfileAreaMarkerIcon } from '@/components/atoms/_svg/ProfileAreaMarkerIcon';
import type { MapEventData } from '@/app/api/events/route';
import { ProfileAreaMapBox } from '@/components/molecules/HybridPromptInput/ProfileSidePanelBox';
import {
	profileBioIconSvg,
	profileGenreOptionRows,
	profilePerformingNameIconSvg,
} from '@/components/molecules/HybridPromptInput/profileFieldIcons';
import { mapBusinessTypeToCategory } from '@/constants/contactCategories';
import { stateBadgeColorMap } from '@/constants/ui';
import { useMe } from '@/hooks/useMe';
import { getStateAbbreviation } from '@/utils/string';
import type { MediaAssetDto } from '@/app/api/media/route';
import {
	useCreateMediaEmbed,
	useDeleteMedia,
	useGetMedia,
} from '@/hooks/queryHooks/useMediaAssets';
import { useMediaUpload, type UploadState } from '@/hooks/useMediaUpload';
import { MediaAssetPlayer } from '@/components/molecules/MediaAssetPlayer/MediaAssetPlayer';
import {
	useApplyToEvent,
	useGetMyEventApplications,
	type MyEventApplication,
} from '@/hooks/queryHooks/useEventApplications';
import { useGetIdentities } from '@/hooks/queryHooks/useIdentities';
import type { Identity } from '@prisma/client';
import { formatMapPostedEventDate } from './MapEventPopupCard';
import { stripTrailingDateFromEventName } from '@/utils/eventChatStatus';

// Drop a file extension for display; YouTube embeds already have a clean "YouTube video".
const getApplyMediaTitle = (filename: string) => filename.replace(/\.[^/.]+$/, '') || filename;

// Map a stored genre (application snapshot or Identity free text) onto the modal's
// canonical option labels; the genre pill only renders on an exact label match, so a
// non-matching value must fall through rather than seed an invisible selection.
const canonicalGenre = (raw?: string | null): string | null => {
	const target = raw?.trim().toLowerCase();
	if (!target) return null;
	return (
		profileGenreOptionRows.flat().find((g) => g.label.toLowerCase() === target)?.label ??
		null
	);
};

// Per-field prefill coalesce: this event's existing application (re-apply shows what
// was submitted) → the most recent application to any other event → the newest-updated
// Identity (campaign profile; its "Performing Name" field is stored as bandName).
const computeApplySeed = (
	eventId: number,
	applications: MyEventApplication[] = [],
	identities: Identity[] = []
) => {
	const forThisEvent = applications.find((a) => a.eventId === eventId); // upsert ⇒ ≤1 per event
	const mostRecentOther = applications.find((a) => a.eventId !== eventId); // createdAt desc
	const identity = identities[0]; // updatedAt desc
	const pick = (...vals: Array<string | null | undefined>) =>
		vals.find((v) => typeof v === 'string' && v.trim() !== '')?.trim() ?? null;
	return {
		genre:
			[forThisEvent?.genre, mostRecentOther?.genre, identity?.genre]
				.map(canonicalGenre)
				.find(Boolean) ?? null,
		area: pick(forThisEvent?.area, mostRecentOther?.area, identity?.area),
		performingName: pick(
			forThisEvent?.performingName,
			mostRecentOther?.performingName,
			identity?.bandName
		),
		bio: pick(forThisEvent?.bio, mostRecentOther?.bio, identity?.bio),
	};
};

const getApplyDaysAway = (startsAt: string | null): number | null => {
	if (!startsAt) return null;
	const start = new Date(startsAt).getTime();
	if (Number.isNaN(start)) return null;
	return Math.max(0, Math.ceil((start - Date.now()) / 86_400_000));
};

/** A ready video slot (273px) — thumbnail, title, play, and delete-on-hover. */
const ApplyMediaSlotCard = ({
	asset,
	onPlay,
	onDelete,
}: {
	asset: MediaAssetDto;
	onPlay: () => void;
	onDelete: () => void;
}) => (
	<div className="group relative h-[66px] w-[273px] shrink-0 overflow-hidden rounded-[9px] bg-[#F2F7FF]">
		<button
			type="button"
			onClick={onPlay}
			aria-label={`Play ${asset.filename}`}
			className="flex h-full w-full items-center gap-[10px] px-[10px] text-left transition hover:brightness-95"
		>
			<span
				className="relative flex h-[48px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-[6px]"
				style={{
					background:
						'linear-gradient(145deg, #EF3030 0%, #F44458 36%, #F04CCB 72%, #FF64D8 100%)',
				}}
			>
				{asset.posterUrl && (
					// eslint-disable-next-line @next/next/no-img-element -- presigned R2 / YouTube CDN URL
					<img src={asset.posterUrl} alt="" className="h-full w-full object-cover" />
				)}
				<span className="absolute inset-0 flex items-center justify-center bg-black/10">
					<span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-black/70 text-white">
						<Play className="h-3 w-3 fill-white" />
					</span>
				</span>
			</span>
			<span className="min-w-0 flex-1 truncate font-inter text-[14px] font-medium leading-[18px] text-black">
				{getApplyMediaTitle(asset.filename)}
			</span>
		</button>
		<button
			type="button"
			onClick={onDelete}
			aria-label={`Remove ${asset.filename}`}
			className="absolute right-[6px] top-[6px] hidden h-[20px] w-[20px] items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 group-hover:flex"
		>
			<X className="h-3 w-3" />
		</button>
	</div>
);

// Centered two-box overlay opened from either Apply button (the posted-event card in the
// search-results panel and the map event popup). Rendered via a portal to <body> so it sits
// above the map's pointer-events:none layer; the page's <html> zoom scales it automatically.
// Closes on backdrop click and Escape. The white inner box holds the "Opportunity" design: a
// pink venue band (wired to the clicked event) and a blue performer profile card (wired to the
// current user), ending in a visual-only Apply button.
export function ApplyModal({
	open,
	event,
	onClose,
}: {
	open: boolean;
	event: MapEventData | null;
	onClose: () => void;
}) {
	// Answer fields — seeded from the user's existing data when the modal opens (see the
	// seeding effect below); submitted as the application snapshot.
	const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
	const [isGenreChooserOpen, setIsGenreChooserOpen] = useState(false);
	const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
	const genreAnchorRef = useRef<HTMLDivElement | null>(null);
	const [selectedArea, setSelectedArea] = useState<string | null>(null);
	const [isAreaChooserOpen, setIsAreaChooserOpen] = useState(false);
	const areaAnchorRef = useRef<HTMLDivElement | null>(null);
	const [selectedPerformingName, setSelectedPerformingName] = useState<string | null>(null);
	const [performingNameDraft, setPerformingNameDraft] = useState('');
	const [isPerformingNameEditorOpen, setIsPerformingNameEditorOpen] = useState(false);
	const [selectedBio, setSelectedBio] = useState<string | null>(null);
	const [bioDraft, setBioDraft] = useState('');
	const [isBioEditorOpen, setIsBioEditorOpen] = useState(false);
	const [isOpportunityExpanded, setIsOpportunityExpanded] = useState(false);

	// Video section: account-level media shared with the profile (context 'profile_media').
	const mediaInputRef = useRef<HTMLInputElement>(null);
	const addAnchorRef = useRef<HTMLDivElement | null>(null);
	const [isYouTubeInputOpen, setIsYouTubeInputOpen] = useState(false);
	const [youTubeDraft, setYouTubeDraft] = useState('');
	const [previewAsset, setPreviewAsset] = useState<MediaAssetDto | null>(null);
	const { data: profileMedia = [] } = useGetMedia('profile_media');
	const { upload: uploadMedia, activeUploads } = useMediaUpload('profile_media');
	const deleteMedia = useDeleteMedia();
	const createEmbed = useCreateMediaEmbed();
	const applyToEvent = useApplyToEvent({
		onSuccess: () => {
			toast.success('Application sent');
			onClose();
		},
	});

	// Prefill sources. `enabled: open` matters: the modal stays mounted while closed, and
	// this hook polls on a 30s interval — the page's own instance is gated to map view, so
	// an ungated copy here would keep that poll alive everywhere. Disabled still reads the
	// warm cache. The identities query shares the page's static ['identities','list'] entry.
	const appsQuery = useGetMyEventApplications({ enabled: open });
	const identitiesQuery = useGetIdentities({});

	// Seed the four answer fields when the modal opens for a new event. lastSeeded is set
	// only once real (settled) data has been applied, so a cold open waits for the queries;
	// seedTarget makes the blank-reset fire exactly once per event so those re-runs don't
	// wipe values the user typed while waiting. Same-event reopens keep local edits.
	const lastSeededEventIdRef = useRef<number | null>(null);
	const seedTargetEventIdRef = useRef<number | null>(null);
	const dirtyFieldsRef = useRef<Set<'genre' | 'area' | 'performingName' | 'bio'>>(
		new Set()
	);

	useEffect(() => {
		if (!open || !event) return;
		if (lastSeededEventIdRef.current === event.id) return;

		if (seedTargetEventIdRef.current !== event.id) {
			seedTargetEventIdRef.current = event.id;
			dirtyFieldsRef.current = new Set();
			setSelectedGenre(null);
			setSelectedArea(null);
			setSelectedPerformingName(null);
			setSelectedBio(null);
			setPerformingNameDraft('');
			setBioDraft('');
			setIsGenreChooserOpen(false);
			setIsAreaChooserOpen(false);
			setIsPerformingNameEditorOpen(false);
			setIsBioEditorOpen(false);
			setIsOpportunityExpanded(false);
		}

		// Errors count as settled so one failed source never blocks seeding from the other.
		const appsSettled = appsQuery.isSuccess || appsQuery.isError;
		const identitiesSettled = identitiesQuery.isSuccess || identitiesQuery.isError;
		if (!appsSettled || !identitiesSettled) return;

		const seed = computeApplySeed(event.id, appsQuery.data, identitiesQuery.data);
		const dirty = dirtyFieldsRef.current;
		if (!dirty.has('genre')) setSelectedGenre(seed.genre);
		if (!dirty.has('area')) setSelectedArea(seed.area);
		// Skip a field whose editor is open mid-load: its blur commit (`trim() || null`)
		// would otherwise silently null a value seeded underneath it.
		if (!dirty.has('performingName') && !isPerformingNameEditorOpen)
			setSelectedPerformingName(seed.performingName);
		if (!dirty.has('bio') && !isBioEditorOpen) setSelectedBio(seed.bio);
		lastSeededEventIdRef.current = event.id;
	}, [
		open,
		event,
		appsQuery.isSuccess,
		appsQuery.isError,
		appsQuery.data,
		identitiesQuery.isSuccess,
		identitiesQuery.isError,
		identitiesQuery.data,
		isPerformingNameEditorOpen,
		isBioEditorOpen,
	]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	// Close the genre chooser on an outside click without closing the whole modal.
	useEffect(() => {
		if (!isGenreChooserOpen) return;
		const onDown = (e: MouseEvent) => {
			if (genreAnchorRef.current && !genreAnchorRef.current.contains(e.target as Node))
				setIsGenreChooserOpen(false);
		};
		document.addEventListener('mousedown', onDown);
		return () => document.removeEventListener('mousedown', onDown);
	}, [isGenreChooserOpen]);

	// Same for the area chooser (the map stays open until you click away).
	useEffect(() => {
		if (!isAreaChooserOpen) return;
		const onDown = (e: MouseEvent) => {
			if (areaAnchorRef.current && !areaAnchorRef.current.contains(e.target as Node))
				setIsAreaChooserOpen(false);
		};
		document.addEventListener('mousedown', onDown);
		return () => document.removeEventListener('mousedown', onDown);
	}, [isAreaChooserOpen]);

	// Close the YouTube input on an outside click (keep the modal open).
	useEffect(() => {
		if (!isYouTubeInputOpen) return;
		const onDown = (e: MouseEvent) => {
			if (addAnchorRef.current && !addAnchorRef.current.contains(e.target as Node)) {
				setIsYouTubeInputOpen(false);
			}
		};
		document.addEventListener('mousedown', onDown);
		return () => document.removeEventListener('mousedown', onDown);
	}, [isYouTubeInputOpen]);

	const { user } = useMe();

	// Ready assets + in-flight uploads, capped at 3 (shared with the profile pool).
	const mediaSlots: Array<
		{ type: 'asset'; asset: MediaAssetDto } | { type: 'upload'; upload: UploadState }
	> = [
		...profileMedia.map((asset) => ({ type: 'asset' as const, asset })),
		...activeUploads.map((upload) => ({ type: 'upload' as const, upload })),
	];
	const canAddMedia = mediaSlots.length < 3;

	const handleSelectMediaFile = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (file) void uploadMedia(file);
	};
	const openFilePicker = () => mediaInputRef.current?.click();
	const openYouTubeInput = () => {
		setYouTubeDraft('');
		setIsYouTubeInputOpen(true);
	};
	const commitYouTube = async () => {
		const url = youTubeDraft.trim();
		if (!url) return;
		try {
			await createEmbed.mutateAsync({ url, context: 'profile_media' });
			setYouTubeDraft('');
			setIsYouTubeInputOpen(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add video');
		}
	};

	// Match options case-insensitively (like getProfileGenreIcon) so any seeded
	// free-text genre still maps to its canonical chip.
	const normalizedSelectedGenre = selectedGenre?.trim().toLowerCase() ?? null;
	const selectedGenreOption = profileGenreOptionRows
		.flat()
		.find((genre) => genre.label.toLowerCase() === normalizedSelectedGenre);
	const SelectedGenreIcon = selectedGenreOption?.Icon;
	const handleGenrePick = (label: string) => {
		dirtyFieldsRef.current.add('genre');
		setSelectedGenre(label);
		setIsGenreChooserOpen(false);
	};
	// Keep the area chooser open after a pick so the map + city label stay visible;
	// it collapses to the pill on an outside click.
	const handleAreaUpdate = (area: string) => {
		const next = area.trim();
		if (next) {
			dirtyFieldsRef.current.add('area');
			setSelectedArea(next);
		}
	};
	// Performing Name is a plain text editor: commit on blur, cancel on Escape.
	const openPerformingNameEditor = () => {
		setPerformingNameDraft(selectedPerformingName ?? '');
		setIsPerformingNameEditorOpen(true);
	};
	const commitPerformingName = () => {
		dirtyFieldsRef.current.add('performingName');
		setSelectedPerformingName(performingNameDraft.trim() || null);
		setIsPerformingNameEditorOpen(false);
	};
	const cancelPerformingNameEdit = () => {
		setPerformingNameDraft(selectedPerformingName ?? '');
		setIsPerformingNameEditorOpen(false);
	};
	// Bio is a multi-line text editor; Enter adds a newline, blur commits, Escape cancels.
	const openBioEditor = () => {
		setBioDraft(selectedBio ?? '');
		setIsBioEditorOpen(true);
	};
	const commitBio = () => {
		dirtyFieldsRef.current.add('bio');
		setSelectedBio(bioDraft.trim() || null);
		setIsBioEditorOpen(false);
	};
	const cancelBioEdit = () => {
		setBioDraft(selectedBio ?? '');
		setIsBioEditorOpen(false);
	};

	// Venue header (mirrors the pink band in MapEventPopupCard).
	const eventName = event?.name?.trim() || 'Posted Event';
	const eventTitle = stripTrailingDateFromEventName(eventName);
	const dateLabel = event ? formatMapPostedEventDate(event) : 'Date TBA';
	const daysAway = getApplyDaysAway(event?.startsAt ?? null);
	const details = event?.details?.trim() || '';
	const pay = event?.pay?.trim() || '';
	const venueName = event?.venueName?.trim() || 'Venue TBA';
	const venueCity = event?.venueCity?.trim() || '';
	const venueStateAbbr =
		getStateAbbreviation(event?.venueState || '') ||
		event?.venueState?.trim().toUpperCase() ||
		'';
	const iconCategory = mapBusinessTypeToCategory(event?.venueBusinessType ?? null);
	const iconSpec = iconCategory ? getTooltipCategoryIconSpec(iconCategory) : null;

	// Performer header (current user).
	const performerName =
		`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Your Profile';
	const performerInitial = performerName.charAt(0).toUpperCase() || '?';

	if (!open || typeof window === 'undefined') return null;

	return createPortal(
		<>
		<div
			className="fixed inset-0 z-[100001] flex items-center justify-center"
			style={{ pointerEvents: 'auto' }}
			onClick={onClose}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					position: 'relative',
					width: '698px',
					height: '750px',
					background: '#E06E6E',
					border: '3px solid #070707',
					borderRadius: '14px',
					boxSizing: 'border-box',
					// Nudge up so the box clears the bottom advanced-search bar.
					transform: 'translateY(-20px)',
				}}
			>
				<div
					className="font-inter"
					style={{
						position: 'absolute',
						bottom: '7px',
						left: 0,
						right: 0,
						marginLeft: 'auto',
						marginRight: 'auto',
						width: '687px',
						height: '723px',
						borderRadius: '12px',
						border: '2px solid #000',
						background: '#FFF',
						color: '#000',
						boxSizing: 'border-box',
					}}
				>
					{/* Box 1: opportunity surface — collapsed venue band, expanded details card. */}
					<div
						role="button"
						tabIndex={0}
						aria-expanded={isOpportunityExpanded}
						aria-label={
							isOpportunityExpanded
								? `Collapse opportunity details for ${eventName}`
								: `Expand opportunity details for ${eventName}`
						}
						onClick={(e) => {
							e.stopPropagation();
							setIsOpportunityExpanded((prev) => !prev);
						}}
						onKeyDown={(e) => {
							if (e.key !== 'Enter' && e.key !== ' ') return;
							e.preventDefault();
							e.stopPropagation();
							setIsOpportunityExpanded((prev) => !prev);
						}}
						style={{
							position: 'absolute',
							top: '21px',
							left: 0,
							right: 0,
							marginLeft: 'auto',
							marginRight: 'auto',
							width: '660px',
							height: isOpportunityExpanded ? '452px' : '63px',
							borderRadius: '12px',
							border: '2px solid #000',
							background: '#FFF',
							overflow: 'hidden',
							boxSizing: 'border-box',
							cursor: 'pointer',
						}}
					>
						{isOpportunityExpanded ? (
							<>
								<div
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										right: 0,
										height: '112px',
										padding: '14px 24px 0',
										boxSizing: 'border-box',
										overflow: 'hidden',
									}}
								>
									<div
										style={{
											display: 'flex',
											alignItems: 'flex-start',
											justifyContent: 'space-between',
											gap: '18px',
										}}
									>
										<div
											style={{
												minWidth: 0,
												fontSize: '28px',
												fontWeight: 500,
												lineHeight: 1.08,
											}}
										>
											<div>{eventTitle}</div>
											<div
												style={{
													display: 'inline-flex',
													marginTop: '3px',
													borderRadius: '6px',
													background: '#D6F7FF',
													padding: '0 4px',
												}}
											>
												{dateLabel}
											</div>
										</div>
										{daysAway != null && (
											<div
												style={{
													marginTop: '4px',
													flexShrink: 0,
													fontSize: '22px',
													fontWeight: 500,
													lineHeight: 1,
													whiteSpace: 'nowrap',
												}}
											>
												<span
													style={{
														borderRadius: '6px',
														background: '#FFD5D5',
														padding: '0 4px',
													}}
												>
													{daysAway}
												</span>{' '}
												days away
											</div>
										)}
									</div>
								</div>
								<div
									style={{
										position: 'absolute',
										top: '112px',
										left: 0,
										right: 0,
										height: '40px',
										background: '#FFD5D5',
										display: 'flex',
										alignItems: 'center',
										gap: '8px',
										padding: '0 14px',
										borderTop: '2px solid #000',
										borderBottom: '2px solid #000',
										boxSizing: 'border-box',
									}}
								>
									<MapStackStarIcon size={24} className="flex-shrink-0" />
									<span
										style={{
											fontSize: '18px',
											fontWeight: 700,
											lineHeight: 1.1,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
											minWidth: 0,
											flex: '0 1 auto',
										}}
									>
										{venueName}
									</span>
									{iconSpec && (
										<span
											style={{
												flexShrink: 0,
												display: 'inline-flex',
												alignItems: 'center',
												justifyContent: 'center',
												width: '28px',
												height: '24px',
												borderRadius: '6px',
												border: '1.5px solid #000',
												background: '#C9C2F2',
											}}
										>
											<svg
												viewBox={iconSpec.viewBox}
												preserveAspectRatio="xMidYMid meet"
												style={{ width: '18px', height: '18px', display: 'block' }}
												dangerouslySetInnerHTML={{
													__html: normalizeInlineSvgMarkupForXml(iconSpec.content),
												}}
											/>
										</span>
									)}
									{venueStateAbbr && (
										<span
											style={{
												flexShrink: 0,
												display: 'inline-flex',
												alignItems: 'center',
												justifyContent: 'center',
												height: '20px',
												minWidth: '36px',
												padding: '0 5px',
												borderRadius: '6px',
												border: '1px solid #000',
												backgroundColor: stateBadgeColorMap[venueStateAbbr] || '#FFF8DC',
												fontSize: '13px',
												fontWeight: 700,
												lineHeight: 1,
											}}
										>
											{venueStateAbbr}
										</span>
									)}
									{venueCity && (
										<span
											style={{
												fontSize: '14px',
												lineHeight: 1,
												flexShrink: 0,
												whiteSpace: 'nowrap',
											}}
										>
											{venueCity}
										</span>
									)}
								</div>
								<div
									style={{
										position: 'absolute',
										top: '152px',
										left: 0,
										right: 0,
										bottom: 0,
										display: 'grid',
										gridTemplateColumns: pay ? '1fr 1fr' : '1fr',
										columnGap: '34px',
										padding: '30px 28px',
										boxSizing: 'border-box',
										overflow: 'hidden',
										fontSize: '16px',
										lineHeight: 1.2,
									}}
								>
									{pay && (
										<div
											style={{
												whiteSpace: 'pre-wrap',
												fontWeight: 700,
											}}
										>
											{pay}
										</div>
									)}
									<div style={{ whiteSpace: 'pre-wrap' }}>
										{details || 'Details TBA'}
									</div>
								</div>
							</>
						) : (
							<>
						<div
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
								height: '40px',
								background: '#FFD5D5',
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								padding: '0 14px',
								boxSizing: 'border-box',
							}}
						>
							<MapStackStarIcon size={24} className="flex-shrink-0" />
							<span
								style={{
									fontSize: '18px',
									fontWeight: 700,
									lineHeight: 1.1,
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
									minWidth: 0,
									flex: '0 1 auto',
								}}
							>
								{venueName}
							</span>
							{iconSpec && (
								<span
									style={{
										flexShrink: 0,
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										width: '28px',
										height: '24px',
										borderRadius: '6px',
										border: '1.5px solid #000',
										background: '#C9C2F2',
									}}
								>
									<svg
										viewBox={iconSpec.viewBox}
										preserveAspectRatio="xMidYMid meet"
										style={{ width: '18px', height: '18px', display: 'block' }}
										dangerouslySetInnerHTML={{
											__html: normalizeInlineSvgMarkupForXml(iconSpec.content),
										}}
									/>
								</span>
							)}
							{venueStateAbbr && (
								<span
									style={{
										flexShrink: 0,
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										height: '20px',
										minWidth: '36px',
										padding: '0 5px',
										borderRadius: '6px',
										border: '1px solid #000',
										backgroundColor: stateBadgeColorMap[venueStateAbbr] || '#FFF8DC',
										fontSize: '13px',
										fontWeight: 700,
										lineHeight: 1,
									}}
								>
									{venueStateAbbr}
								</span>
							)}
							{venueCity && (
								<span
									style={{
										fontSize: '14px',
										lineHeight: 1,
										flexShrink: 0,
										whiteSpace: 'nowrap',
									}}
								>
									{venueCity}
								</span>
							)}
						</div>
						<div
							style={{
								position: 'absolute',
								top: '40px',
								left: 0,
								right: 0,
								height: '2px',
								background: '#000',
							}}
						/>
							</>
						)}
					</div>

					{/* Box 2: profile card — 659x552, blue header (#ABCBF9) above a divider at 56px. */}
					<div
						role={isOpportunityExpanded ? 'button' : undefined}
						tabIndex={isOpportunityExpanded ? 0 : undefined}
						aria-label={isOpportunityExpanded ? 'Expand profile application form' : undefined}
						onClickCapture={(e) => {
							if (!isOpportunityExpanded) return;
							e.stopPropagation();
							setIsOpportunityExpanded(false);
						}}
						onKeyDown={(e) => {
							if (!isOpportunityExpanded) return;
							if (e.key !== 'Enter' && e.key !== ' ') return;
							e.preventDefault();
							e.stopPropagation();
							setIsOpportunityExpanded(false);
						}}
						style={{
							position: 'absolute',
							top: isOpportunityExpanded ? '486px' : '94px',
							left: 0,
							right: 0,
							marginLeft: 'auto',
							marginRight: 'auto',
							width: '659px',
							height: isOpportunityExpanded ? '160px' : '552px',
							borderRadius: '12px',
							border: '2px solid #000',
							background: isOpportunityExpanded ? '#A9C9F9' : '#F2F7FF',
							overflow: 'hidden',
							boxSizing: 'border-box',
							cursor: isOpportunityExpanded ? 'pointer' : undefined,
						}}
					>
						<div
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
								height: '56px',
								background: isOpportunityExpanded ? '#FFF' : '#ABCBF9',
								display: 'flex',
								alignItems: 'center',
								gap: '12px',
								padding: '0 16px',
								boxSizing: 'border-box',
							}}
						>
							<span
								style={{
									flexShrink: 0,
									width: '36px',
									height: '36px',
									borderRadius: '50%',
									background: '#54D06A',
									color: '#FFF',
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: '18px',
									fontWeight: 700,
									lineHeight: 1,
								}}
							>
								{performerInitial}
							</span>
							<span
								style={{
									background: '#C7F5CE',
									borderRadius: '6px',
									padding: '3px 10px',
									fontSize: '18px',
									fontWeight: 700,
									lineHeight: 1.1,
									whiteSpace: 'nowrap',
								}}
							>
								{performerName}
							</span>
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
								<span
									style={{
										width: '28px',
										height: '28px',
										borderRadius: '6px',
										border: '1px solid #000',
										background: '#CFE0FB',
									}}
								/>
								<span
									style={{
										width: '28px',
										height: '28px',
										borderRadius: '6px',
										border: '1px solid #000',
										background: '#E8F0FE',
									}}
								/>
								<span
									style={{
										width: '28px',
										height: '28px',
										borderRadius: '6px',
										border: '1px solid #000',
										background: '#FFF',
									}}
								/>
							</span>
						</div>
						<div
							style={{
								position: 'absolute',
								top: '56px',
								left: 0,
								right: 0,
								height: '2px',
								background: '#000',
							}}
						/>

						{/* Body: white content panel (639x401), 58px below the divider (divider ends at 58px). */}
						<div
							style={{
								position: 'absolute',
								top: isOpportunityExpanded ? '58px' : '116px',
								left: 0,
								right: 0,
								marginLeft: 'auto',
								marginRight: 'auto',
								width: isOpportunityExpanded ? '100%' : '639px',
								height: isOpportunityExpanded ? '102px' : '401px',
								borderRadius: isOpportunityExpanded ? 0 : '9px',
								background: isOpportunityExpanded ? '#A9C9F9' : '#FFF',
								// Clip overflowing fields at the white box's own (rounded) bottom edge
								// instead of letting them spill out to the card border below.
								overflow: 'hidden',
								display: 'flex',
								gap: '24px',
								padding: isOpportunityExpanded
									? '10px 9px 10px 68px'
									: '32px 9px 32px 16px',
								boxSizing: 'border-box',
							}}
						>
							{isOpportunityExpanded ? (
								<div
									style={{
										width: '100%',
										display: 'grid',
										gridTemplateColumns: '350px minmax(0, 1fr)',
										columnGap: '22px',
										alignItems: 'start',
										color: '#000',
										pointerEvents: 'none',
									}}
								>
									<div style={{ minWidth: 0 }}>
										<div
											style={{
												display: 'flex',
												gap: '24px',
												alignItems: 'flex-start',
											}}
										>
											<div>
												<div
													style={{
														color: 'rgba(255,255,255,0.65)',
														fontSize: '9px',
														fontWeight: 700,
														lineHeight: 1,
													}}
												>
													Genre
												</div>
												<div
													style={{
														marginTop: '2px',
														fontSize: '16px',
														fontWeight: 500,
														lineHeight: 1.05,
													}}
												>
													{selectedGenre || 'Not set'}
												</div>
											</div>
											<div>
												<div
													style={{
														color: 'rgba(255,255,255,0.65)',
														fontSize: '9px',
														fontWeight: 700,
														lineHeight: 1,
													}}
												>
													Area
												</div>
												<div
													style={{
														marginTop: '2px',
														maxWidth: '230px',
														overflow: 'hidden',
														textOverflow: 'ellipsis',
														whiteSpace: 'nowrap',
														fontSize: '16px',
														fontWeight: 500,
														lineHeight: 1.05,
													}}
												>
													{selectedArea || 'Not set'}
												</div>
											</div>
										</div>
										<div style={{ marginTop: '8px' }}>
											<div
												style={{
													color: 'rgba(255,255,255,0.65)',
													fontSize: '9px',
													fontWeight: 700,
													lineHeight: 1,
												}}
											>
												Performing Name
											</div>
											<div
												style={{
													marginTop: '2px',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap',
													fontSize: '16px',
													fontWeight: 500,
													lineHeight: 1.05,
												}}
											>
												{selectedPerformingName || performerName}
											</div>
										</div>
									</div>
									<div style={{ minWidth: 0 }}>
										<div
											style={{
												color: 'rgba(255,255,255,0.65)',
												fontSize: '9px',
												fontWeight: 700,
												lineHeight: 1,
											}}
										>
											Bio
										</div>
										<div
											style={{
												marginTop: '3px',
												display: '-webkit-box',
												WebkitLineClamp: 4,
												WebkitBoxOrient: 'vertical',
												overflow: 'hidden',
												fontSize: '11px',
												fontWeight: 700,
												lineHeight: 1.28,
											}}
										>
											{selectedBio || 'Tell venues about yourself'}
										</div>
									</div>
								</div>
							) : (
								<>
							<div
								style={{
									flex: 1,
									// Keep wide chooser boxes (334px) from expanding this column and
									// pushing the video column right; let them overflow instead.
									minWidth: 0,
									display: 'flex',
									flexDirection: 'column',
									gap: '40px',
									color: '#9A9A9A',
									fontSize: '12.35px',
									fontWeight: 600,
									lineHeight: '22.175px',
								}}
							>
								<div
									ref={genreAnchorRef}
									style={{ position: 'relative', flexShrink: 0 }}
								>
									<button
										type="button"
										onClick={() => setIsGenreChooserOpen(true)}
										className={`block cursor-pointer appearance-none border-0 bg-transparent p-0 text-left font-inter text-[12.35px] leading-[22.175px] ${
											selectedGenre
												? 'font-black text-[#76E59B]'
												: 'font-semibold text-[#9A9A9A]'
										}`}
									>
										<span className="relative inline-flex">
											{selectedGenre && (
												<span
													aria-hidden="true"
													className="absolute left-[-5px] right-[-5px] top-1/2 h-[7px] -translate-y-1/2 rounded-[3px] bg-[#D6FFED]"
												/>
											)}
											<span className="relative z-10">Genre</span>
										</span>
									</button>
									{selectedGenreOption && !isGenreChooserOpen && (
										<button
											type="button"
											onClick={() => setIsGenreChooserOpen(true)}
											className="mt-[5px] flex h-[21.374px] appearance-none items-center justify-center gap-[3px] rounded-[7.491px] border-0 bg-[#F4F4F4] px-[4px] font-inter text-[14px] font-medium leading-[21.374px] text-black transition hover:brightness-95"
											style={{ width: `${selectedGenreOption.width}px` }}
										>
											{SelectedGenreIcon && (
												<SelectedGenreIcon aria-hidden="true" className="shrink-0" />
											)}
											<span>{selectedGenreOption.label}</span>
										</button>
									)}
									{isGenreChooserOpen && (
										<div style={{ marginTop: '5px' }}>
											<div className="relative box-border h-[129px] w-[334px] shrink-0 overflow-hidden rounded-[9px] border-[1.526px] border-black bg-white opacity-80">
												<div className="box-border flex h-[27px] items-center px-[10px] font-inter text-[17.507px] font-medium leading-[23.342px] text-black">
													Choose your Genre
												</div>
												<div className="absolute inset-x-0 bottom-0 top-[27px] bg-[#BAD4FA]" />
												<div className="absolute left-0 top-[27px] w-full border-t-[1.526px] border-black" />
												<div className="absolute left-[11px] right-[11px] top-[37px] flex flex-col gap-[9px]">
													{profileGenreOptionRows.map((row) => (
														<div
															key={row.map((genre) => genre.label).join('-')}
															className="flex justify-between"
														>
															{row.map((genre) => {
																const Icon = genre.Icon;
																const isSelected =
																	genre.label.toLowerCase() === normalizedSelectedGenre;
																const isHovered = genre.label === hoveredGenre;

																return (
																	<button
																		type="button"
																		key={genre.label}
																		onClick={() => handleGenrePick(genre.label)}
																		onMouseEnter={() => setHoveredGenre(genre.label)}
																		onMouseLeave={() => setHoveredGenre(null)}
																		className={`flex h-[21.374px] cursor-pointer appearance-none items-center justify-center gap-[3px] rounded-[7.491px] border-0 px-[4px] font-inter text-[14px] font-medium leading-[21.374px] text-black transition-colors ${
																			isSelected || isHovered ? 'bg-[#D6FFED]' : 'bg-white'
																		}`}
																		style={{ width: `${genre.width}px` }}
																	>
																		{Icon && <Icon aria-hidden="true" className="shrink-0" />}
																		<span>{genre.label}</span>
																	</button>
																);
															})}
														</div>
													))}
												</div>
											</div>
										</div>
									)}
								</div>
								<div
									ref={areaAnchorRef}
									style={{ position: 'relative', flexShrink: 0 }}
								>
									<button
										type="button"
										onClick={() => setIsAreaChooserOpen(true)}
										className={`block cursor-pointer appearance-none border-0 bg-transparent p-0 text-left font-inter text-[12.35px] leading-[22.175px] ${
											selectedArea
												? 'font-black text-[#76E59B]'
												: 'font-semibold text-[#9A9A9A]'
										}`}
									>
										<span className="relative inline-flex">
											{selectedArea && (
												<span
													aria-hidden="true"
													className="absolute left-[-5px] right-[-5px] top-1/2 h-[7px] -translate-y-1/2 rounded-[3px] bg-[#D6FFED]"
												/>
											)}
											<span className="relative z-10">Area</span>
										</span>
									</button>
									{selectedArea && !isAreaChooserOpen && (
										<button
											type="button"
											onClick={() => setIsAreaChooserOpen(true)}
											className="mt-[5px] flex h-[21.374px] w-fit max-w-[334px] appearance-none items-center gap-[4px] overflow-hidden rounded-[7.491px] border-0 bg-[#F4F4F4] px-[6px] font-inter text-[14px] font-medium leading-[21.374px] text-black transition hover:brightness-95"
										>
											<span aria-hidden="true" className="block h-[16px] w-[13px] shrink-0">
												<ProfileAreaMarkerIcon className="h-full w-full" />
											</span>
											<span className="min-w-0 truncate">{selectedArea}</span>
										</button>
									)}
									{isAreaChooserOpen && (
										<ProfileAreaMapBox
											area={selectedArea ?? ''}
											onAreaUpdate={handleAreaUpdate}
										/>
									)}
								</div>
								<div style={{ flexShrink: 0 }}>
									<button
										type="button"
										onClick={openPerformingNameEditor}
										className={`block cursor-pointer appearance-none border-0 bg-transparent p-0 text-left font-inter text-[12.35px] leading-[22.175px] ${
											selectedPerformingName
												? 'font-black text-[#76E59B]'
												: 'font-semibold text-[#9A9A9A]'
										}`}
									>
										<span className="relative inline-flex">
											{selectedPerformingName && (
												<span
													aria-hidden="true"
													className="absolute left-[-5px] right-[-5px] top-1/2 h-[7px] -translate-y-1/2 rounded-[3px] bg-[#D6FFED]"
												/>
											)}
											<span className="relative z-10">Performing Name</span>
										</span>
									</button>
									{isPerformingNameEditorOpen ? (
										<input
											type="text"
											value={performingNameDraft}
											onChange={(e) => setPerformingNameDraft(e.target.value)}
											onBlur={commitPerformingName}
											onKeyDown={(e) => {
												if (e.key === 'Enter') {
													e.preventDefault();
													commitPerformingName();
												} else if (e.key === 'Escape') {
													e.preventDefault();
													cancelPerformingNameEdit();
												}
											}}
											autoFocus
											placeholder="Your performing name"
											aria-label="Performing name"
											className="mt-[5px] block w-[301px] appearance-none border-0 bg-transparent p-0 font-inter text-[14px] font-medium leading-[21.374px] text-black outline-none placeholder:text-[#9A9A9A]"
										/>
									) : selectedPerformingName ? (
										<button
											type="button"
											onClick={openPerformingNameEditor}
											className="mt-[5px] flex h-[21.374px] w-fit max-w-[334px] appearance-none items-center gap-[4px] overflow-hidden rounded-[7.491px] border-0 bg-[#F4F4F4] px-[6px] font-inter text-[14px] font-medium leading-[21.374px] text-black transition hover:brightness-95"
										>
											<span
												aria-hidden="true"
												className="block h-[16px] w-[16px] shrink-0"
												dangerouslySetInnerHTML={{
													__html: profilePerformingNameIconSvg,
												}}
											/>
											<span className="min-w-0 truncate">{selectedPerformingName}</span>
										</button>
									) : null}
								</div>
								<div style={{ flexShrink: 0 }}>
									<button
										type="button"
										onClick={openBioEditor}
										className={`block cursor-pointer appearance-none border-0 bg-transparent p-0 text-left font-inter text-[12.35px] leading-[22.175px] ${
											selectedBio
												? 'font-black text-[#76E59B]'
												: 'font-semibold text-[#9A9A9A]'
										}`}
									>
										<span className="relative inline-flex">
											{selectedBio && (
												<span
													aria-hidden="true"
													className="absolute left-[-5px] right-[-5px] top-1/2 h-[7px] -translate-y-1/2 rounded-[3px] bg-[#D6FFED]"
												/>
											)}
											<span className="relative z-10">Bio</span>
										</span>
									</button>
									{isBioEditorOpen ? (
										<textarea
											value={bioDraft}
											onChange={(e) => setBioDraft(e.target.value)}
											onBlur={commitBio}
											onKeyDown={(e) => {
												if (e.key === 'Escape') {
													e.preventDefault();
													cancelBioEdit();
												}
											}}
											autoFocus
											placeholder="Tell venues about yourself"
											aria-label="Bio"
											className="mt-[5px] block h-[81px] w-[326px] resize-none appearance-none border-0 bg-transparent p-0 font-inter text-[14px] font-medium leading-[18px] text-black outline-none placeholder:text-[#9A9A9A]"
										/>
									) : selectedBio ? (
										<button
											type="button"
											onClick={openBioEditor}
											className="mt-[5px] flex h-[81px] w-[326px] appearance-none items-start gap-[9px] overflow-hidden rounded-[9px] border-0 bg-[#F4F4F4] px-[10px] py-[9px] text-left font-inter text-[13px] font-medium leading-[16px] text-black transition hover:brightness-95"
										>
											<span
												aria-hidden="true"
												className="mt-[1px] block h-[17px] w-[8px] shrink-0"
												dangerouslySetInnerHTML={{ __html: profileBioIconSvg }}
											/>
											<span className="line-clamp-3 min-w-0 whitespace-normal">
												{selectedBio}
											</span>
										</button>
									) : null}
								</div>
							</div>
							<div
								style={{
									width: '273px',
									flexShrink: 0,
									display: 'flex',
									flexDirection: 'column',
									gap: '18px',
								}}
							>
								<span
									style={{
										color: '#000',
										fontSize: '11.418px',
										fontStyle: 'italic',
										fontWeight: 300,
										lineHeight: '15.223px',
									}}
								>
									Add a video to verify your account and improve your profile
								</span>
								<input
									ref={mediaInputRef}
									type="file"
									accept="video/*"
									className="hidden"
									onChange={handleSelectMediaFile}
								/>
								{[0, 1, 2].map((index) => {
									const slot = mediaSlots[index];

									if (slot?.type === 'asset' && slot.asset.status === 'ready') {
										const asset = slot.asset;
										return (
											<ApplyMediaSlotCard
												key={asset.id}
												asset={asset}
												onPlay={() => setPreviewAsset(asset)}
												onDelete={() => deleteMedia.mutate(asset.id)}
											/>
										);
									}

									if (slot?.type === 'asset') {
										const asset = slot.asset;
										return (
											<div
												key={asset.id}
												className="relative flex h-[66px] w-[273px] shrink-0 items-center justify-center rounded-[9px] bg-[#F2F7FF] font-inter text-[11px] text-black/50"
											>
												{asset.status === 'failed' ? 'Upload failed' : 'Processing…'}
												<button
													type="button"
													onClick={() => deleteMedia.mutate(asset.id)}
													aria-label="Remove"
													className="absolute right-[6px] top-[6px] flex h-[20px] w-[20px] items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
												>
													<X className="h-3 w-3" />
												</button>
											</div>
										);
									}

									if (slot?.type === 'upload') {
										return (
											<div
												key={`upload-${index}`}
												className="flex h-[66px] w-[273px] shrink-0 flex-col items-center justify-center gap-[8px] rounded-[9px] bg-[#F2F7FF] px-[16px]"
											>
												<span className="w-full truncate text-center font-inter text-[11px] text-black/70">
													{slot.upload.filename}
												</span>
												<div className="h-[4px] w-full overflow-hidden rounded-full bg-black/10">
													<div
														className="h-full rounded-full bg-[#7BDB7F] transition-[width] duration-200"
														style={{ width: `${slot.upload.progress}%` }}
													/>
												</div>
											</div>
										);
									}

									if (index === mediaSlots.length && canAddMedia) {
										return (
											<div key="add" ref={addAnchorRef} className="w-[273px] shrink-0">
												{isYouTubeInputOpen ? (
													<input
														type="text"
														value={youTubeDraft}
														onChange={(e) => setYouTubeDraft(e.target.value)}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																void commitYouTube();
															} else if (e.key === 'Escape') {
																e.preventDefault();
																setIsYouTubeInputOpen(false);
															}
														}}
														autoFocus
														placeholder="Paste a YouTube link, then press Enter"
														aria-label="YouTube link"
														className="h-[66px] w-[273px] rounded-[9px] bg-[#F2F7FF] px-[14px] font-inter text-[13px] font-medium text-black outline-none placeholder:text-[#8A8A8E]"
													/>
												) : (
													<div className="group relative h-[66px] w-[273px] overflow-hidden rounded-[9px] bg-[#F2F7FF]">
														{/* Default: a centered + that fades out on hover. */}
														<span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[22px] font-light leading-none text-[#8A8A8E] transition-opacity group-hover:opacity-0">
															+
														</span>
														{/* On hover: two options overlaid inside the same fixed-height box. */}
														<div className="pointer-events-none absolute inset-0 flex flex-col font-inter text-[13px] font-medium text-black opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
															<button
																type="button"
																onClick={openFilePicker}
																className="flex flex-1 items-center gap-[8px] px-[14px] text-left transition hover:brightness-95"
															>
																<Upload className="h-[14px] w-[14px]" />
																Upload a video
															</button>
															<button
																type="button"
																onClick={openYouTubeInput}
																className="flex flex-1 items-center gap-[8px] border-t border-black/10 px-[14px] text-left transition hover:brightness-95"
															>
																<Play className="h-[14px] w-[14px] fill-black" />
																Paste YouTube link
															</button>
														</div>
													</div>
												)}
											</div>
										);
									}

									return (
										<div
											key={`empty-${index}`}
											aria-hidden="true"
											className="h-[66px] w-[273px] shrink-0 rounded-[9px] bg-[#F2F7FF]"
											style={{ opacity: [1, 0.8, 0.5][index] }}
										/>
									);
								})}
							</div>
								</>
							)}
						</div>
					</div>

					{/* Apply button — submits the application for this event (snapshot answers
					    + frozen copies of the selected profile videos). */}
					<button
						type="button"
						disabled={applyToEvent.isPending}
						onClick={(e) => {
							e.stopPropagation();
							if (!event || applyToEvent.isPending) return;
							applyToEvent.mutate({
								eventId: event.id,
								genre: selectedGenre ?? undefined,
								area: selectedArea ?? undefined,
								performingName: selectedPerformingName ?? undefined,
								bio: selectedBio ?? undefined,
								mediaAssetIds: profileMedia
									.filter((m) => m.status === 'ready')
									.map((m) => m.id),
							});
						}}
						style={{
							position: 'absolute',
							left: 0,
							right: 0,
							bottom: '15px',
							marginLeft: 'auto',
							marginRight: 'auto',
							width: '244px',
							height: '26px',
							borderRadius: '12.084px',
							background: '#E06D6D',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: '18.909px',
							fontWeight: 500,
							lineHeight: '18.391px',
							color: '#000',
							border: 'none',
							cursor: applyToEvent.isPending ? 'default' : 'pointer',
							opacity: applyToEvent.isPending ? 0.6 : 1,
							fontFamily: 'inherit',
						}}
					>
						{applyToEvent.isPending ? 'Applying…' : 'Apply'}
					</button>
				</div>
			</div>
		</div>
			{previewAsset && (
				<div
					className="fixed inset-0 z-[100002] flex items-center justify-center"
					style={{ pointerEvents: 'auto', background: 'rgba(0,0,0,0.6)' }}
					onClick={() => setPreviewAsset(null)}
				>
					<div
						onClick={(e) => e.stopPropagation()}
						style={{ width: '720px', maxWidth: '90vw' }}
					>
						<MediaAssetPlayer asset={previewAsset} />
					</div>
				</div>
			)}
		</>,
		document.body
	);
}
