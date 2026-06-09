'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
	// Genre + Area selectors (local-only; the modal is visual and does not persist yet).
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

	const { user } = useMe();

	const selectedGenreOption = profileGenreOptionRows
		.flat()
		.find((genre) => genre.label === selectedGenre);
	const SelectedGenreIcon = selectedGenreOption?.Icon;
	const handleGenrePick = (label: string) => {
		setSelectedGenre(label);
		setIsGenreChooserOpen(false);
	};
	// Keep the area chooser open after a pick so the map + city label stay visible;
	// it collapses to the pill on an outside click.
	const handleAreaUpdate = (area: string) => {
		const next = area.trim();
		if (next) setSelectedArea(next);
	};
	// Performing Name is a plain text editor: commit on blur, cancel on Escape.
	const openPerformingNameEditor = () => {
		setPerformingNameDraft(selectedPerformingName ?? '');
		setIsPerformingNameEditorOpen(true);
	};
	const commitPerformingName = () => {
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
		setSelectedBio(bioDraft.trim() || null);
		setIsBioEditorOpen(false);
	};
	const cancelBioEdit = () => {
		setBioDraft(selectedBio ?? '');
		setIsBioEditorOpen(false);
	};

	// Venue header (mirrors the pink band in MapEventPopupCard).
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
					{/* Box 1: venue band — 660x63, pink top region (#FFD5D5) above a divider at 40px. */}
					<div
						style={{
							position: 'absolute',
							top: '21px',
							left: 0,
							right: 0,
							marginLeft: 'auto',
							marginRight: 'auto',
							width: '660px',
							height: '63px',
							borderRadius: '12px',
							border: '2px solid #000',
							background: '#FFF',
							overflow: 'hidden',
							boxSizing: 'border-box',
						}}
					>
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
					</div>

					{/* Box 2: profile card — 659x552, blue header (#ABCBF9) above a divider at 56px. */}
					<div
						style={{
							position: 'absolute',
							top: '94px',
							left: 0,
							right: 0,
							marginLeft: 'auto',
							marginRight: 'auto',
							width: '659px',
							height: '552px',
							borderRadius: '12px',
							border: '2px solid #000',
							background: '#F2F7FF',
							overflow: 'hidden',
							boxSizing: 'border-box',
						}}
					>
						<div
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
								height: '56px',
								background: '#ABCBF9',
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
								top: '116px',
								left: 0,
								right: 0,
								marginLeft: 'auto',
								marginRight: 'auto',
								width: '639px',
								height: '401px',
								borderRadius: '9px',
								background: '#FFF',
								// Clip overflowing fields at the white box's own (rounded) bottom edge
								// instead of letting them spill out to the card border below.
								overflow: 'hidden',
								display: 'flex',
								gap: '24px',
								padding: '32px 9px 32px 16px',
								boxSizing: 'border-box',
							}}
						>
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
																const isSelected = genre.label === selectedGenre;
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
								<div
									style={{
										width: '273px',
										height: '66px',
										borderRadius: '9px',
										background: '#F2F7FF',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										color: '#8A8A8E',
										fontSize: '22px',
										fontWeight: 300,
										lineHeight: 1,
									}}
								>
									+
								</div>
								<div
									style={{
										width: '273px',
										height: '66px',
										borderRadius: '9px',
										background: '#F2F7FF',
										opacity: 0.8,
									}}
								/>
								<div
									style={{
										width: '273px',
										height: '66px',
										borderRadius: '9px',
										background: '#F2F7FF',
										opacity: 0.5,
									}}
								/>
							</div>
						</div>
					</div>

					{/* Apply button — visual only for now (no submit endpoint wired). */}
					<button
						type="button"
						onClick={(e) => e.stopPropagation()}
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
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Apply
					</button>
				</div>
			</div>
		</div>,
		document.body
	);
}
