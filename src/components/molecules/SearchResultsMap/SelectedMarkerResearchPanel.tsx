'use client';

import type { MutableRefObject } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ContactWithName } from '@/types/contact';
import type { LatLngLiteral } from './types';
import { HOVER_TOOLTIP_Z_INDEX, stateBadgeColorMap } from './constants';
import { getStateAbbreviation, parseMetadataSections } from './metadata';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import {
	getWineBeerSpiritsLabel,
	isCoffeeShopTitle,
	isMusicVenueTitle,
	isRestaurantTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
} from '@/utils/restaurantTitle';

export interface SelectedMarkerResearchPanelProps {
	handleResearchPanelMouseEnter: () => void;
	handleResearchPanelMouseLeave: () => void;
	isCoffeeShopsSearch: boolean;
	isLoading: boolean | undefined;
	isMusicVenuesSearch: boolean;
	isRestaurantsSearch: boolean;
	isWeddingPlannersSearch: boolean;
	selectedMarker: ContactWithName | null;
	selectedMarkerCoords: LatLngLiteral | null;
	selectedMarkerOverlayRef: MutableRefObject<HTMLDivElement | null>;
	setSelectedMarker: Dispatch<SetStateAction<ContactWithName | null>>;
}

export const SelectedMarkerResearchPanel = (params: SelectedMarkerResearchPanelProps) => {
	const {
		handleResearchPanelMouseEnter,
		handleResearchPanelMouseLeave,
		isCoffeeShopsSearch,
		isLoading,
		isMusicVenuesSearch,
		isRestaurantsSearch,
		isWeddingPlannersSearch,
		selectedMarker,
		selectedMarkerCoords,
		selectedMarkerOverlayRef,
		setSelectedMarker,
	} = params;
	return (
		<>
			{/* Only show selected marker overlay when not loading */}
			{!isLoading && selectedMarker && selectedMarkerCoords && (
				<div
					ref={selectedMarkerOverlayRef}
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						zIndex: HOVER_TOOLTIP_Z_INDEX + 10,
					}}
				>
					<div
						className="relative"
						style={{
							width: '320px',
							backgroundColor: 'rgba(216, 229, 251, 0.8)',
							border: '2px solid black',
							borderRadius: '7px',
							overflow: 'hidden',
							boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
						}}
						onMouseEnter={handleResearchPanelMouseEnter}
						onMouseLeave={handleResearchPanelMouseLeave}
					>
						{/* Close button */}
						<button
							onClick={() => setSelectedMarker(null)}
							className="absolute top-[10px] -translate-y-1/2 right-2 z-20 flex items-center justify-center text-black/60 hover:text-black transition-colors"
							style={{ fontSize: '14px', lineHeight: 1, fontWeight: 500 }}
						>
							×
						</button>
						{/* Header */}
						<div
							className="w-full"
							style={{ height: '20px', backgroundColor: 'rgba(232, 239, 255, 0.8)' }}
						/>
						<div className="absolute top-[10px] left-[12px] -translate-y-1/2 z-10">
							<span className="font-bold text-[12px] leading-none text-black">
								Research
							</span>
						</div>
						<div
							className="absolute left-0 w-full bg-black z-10"
							style={{ top: '20px', height: '2px' }}
						/>
						{/* Name/Company section */}
						<div className="w-full bg-white" style={{ height: '36px', marginTop: '2px' }}>
							<div className="w-full h-full px-3 flex items-center justify-between overflow-hidden">
								<div className="flex flex-col justify-center min-w-0 flex-1 pr-2">
									<div className="font-inter font-bold text-[13px] leading-none truncate text-black">
										{(() => {
											const fullName = `${selectedMarker.firstName || ''} ${
												selectedMarker.lastName || ''
											}`.trim();
											return (
												fullName ||
												selectedMarker.name ||
												selectedMarker.company ||
												'Unknown'
											);
										})()}
									</div>
									{(() => {
										const fullName = `${selectedMarker.firstName || ''} ${
											selectedMarker.lastName || ''
										}`.trim();
										const hasName =
											fullName.length > 0 ||
											(selectedMarker.name && selectedMarker.name.length > 0);
										if (!hasName) return null;
										return (
											<div className="text-[11px] leading-tight truncate text-black mt-[2px]">
												{selectedMarker.company || ''}
											</div>
										);
									})()}
								</div>
								<div className="flex items-center gap-2 flex-shrink-0">
									<div className="flex flex-col items-end gap-[2px] max-w-[120px]">
										<div className="flex items-center gap-1 w-full justify-end overflow-hidden">
											{(() => {
												const stateAbbr =
													getStateAbbreviation(selectedMarker.state || '') || '';
												if (stateAbbr) {
													return (
														<span
															className="inline-flex items-center justify-center h-[14px] px-[5px] rounded-[3px] border border-black text-[10px] font-bold leading-none flex-shrink-0"
															style={{
																backgroundColor:
																	stateBadgeColorMap[stateAbbr] || '#E0E0E0',
															}}
														>
															{stateAbbr}
														</span>
													);
												}
												return null;
											})()}
											{selectedMarker.city && (
												<span className="text-[11px] leading-none text-black truncate">
													{selectedMarker.city}
												</span>
											)}
										</div>
										{(selectedMarker.curatedDisplayLabel ||
											selectedMarker.title ||
											selectedMarker.headline ||
											isMusicVenuesSearch ||
											isRestaurantsSearch ||
											isCoffeeShopsSearch ||
											isWeddingPlannersSearch) &&
											(() => {
												const titleText =
													selectedMarker.curatedDisplayLabel ||
													selectedMarker.title ||
													selectedMarker.headline ||
													'';
												const isRestaurant =
													isRestaurantsSearch || isRestaurantTitle(titleText);
												const isCoffeeShop =
													isCoffeeShopsSearch || isCoffeeShopTitle(titleText);
												const isMusicVenue =
													isMusicVenuesSearch || isMusicVenueTitle(titleText);
												const isWeddingPlanner =
													isWeddingPlannersSearch || isWeddingPlannerTitle(titleText);
												const isWeddingVenue = isWeddingVenueTitle(titleText);
												const isWineBeerSpirits = isWineBeerSpiritsTitle(titleText);
												const wineBeerSpiritsLabel = getWineBeerSpiritsLabel(titleText);
												return (
													<div
														className="px-1.5 py-[1px] rounded-[6px] border border-black max-w-full flex items-center gap-1"
														style={{
															backgroundColor: isRestaurant
																? '#C3FBD1'
																: isCoffeeShop
																	? '#D6F1BD'
																	: isMusicVenue
																		? '#B7E5FF'
																		: isWeddingPlanner || isWeddingVenue
																			? '#FFF8DC'
																			: isWineBeerSpirits
																				? '#BFC4FF'
																				: '#E8EFFF',
														}}
													>
														{isRestaurant && (
															<RestaurantsIcon size={10} className="flex-shrink-0" />
														)}
														{isCoffeeShop && <CoffeeShopsIcon size={6} />}
														{isMusicVenue && (
															<MusicVenuesIcon size={10} className="flex-shrink-0" />
														)}
														{(isWeddingPlanner || isWeddingVenue) && (
															<WeddingPlannersIcon size={10} />
														)}
														{isWineBeerSpirits && (
															<WineBeerSpiritsIcon size={10} className="flex-shrink-0" />
														)}
														<span className="text-[9px] leading-none text-black block truncate">
															{isRestaurant
																? 'Restaurant'
																: isCoffeeShop
																	? 'Coffee Shop'
																	: isMusicVenue
																		? 'Music Venue'
																		: isWeddingVenue
																			? 'Wedding Venue'
																			: isWeddingPlanner
																				? 'Wedding Planner'
																				: isWineBeerSpirits
																					? wineBeerSpiritsLabel
																					: titleText}
														</span>
													</div>
												);
											})()}
									</div>
								</div>
							</div>
						</div>
						<div
							className="absolute left-0 w-full bg-black z-10"
							style={{ top: '58px', height: '1px' }}
						/>
						{/* Research boxes */}
						{(() => {
							const metadataSections = parseMetadataSections(selectedMarker.metadata);
							const boxConfigs = [
								{ key: '1', color: 'rgba(21, 139, 207, 0.8)' },
								{ key: '2', color: 'rgba(67, 174, 236, 0.8)' },
								{ key: '3', color: 'rgba(124, 201, 246, 0.8)' },
								{ key: '4', color: 'rgba(170, 218, 246, 0.8)' },
							];
							const visibleBoxes = boxConfigs.filter(
								(config) => metadataSections[config.key]
							);

							// If no parsed sections but raw metadata exists, show raw metadata
							if (visibleBoxes.length === 0) {
								if (
									selectedMarker.metadata &&
									selectedMarker.metadata.trim().length > 0
								) {
									// Show raw metadata in a single box if it doesn't match [1], [2] format
									return (
										<div className="p-2">
											<div
												id="map-research-scroll-container"
												className="relative"
												style={{
													width: '100%',
													minHeight: '60px',
													backgroundColor: 'rgba(21, 139, 207, 0.8)',
													border: '2px solid #000000',
													borderRadius: '6px',
												}}
											>
												<style>{`
													#map-research-scroll-container *::-webkit-scrollbar {
														display: none !important;
														width: 0 !important;
														height: 0 !important;
													}
													#map-research-scroll-container * {
														scrollbar-width: none !important;
														-ms-overflow-style: none !important;
													}
												`}</style>
												<div
													className="absolute"
													style={{
														top: '4px',
														bottom: '4px',
														left: '6px',
														right: '6px',
														backgroundColor: '#FFFFFF',
														border: '1px solid #000000',
														borderRadius: '4px',
														overflow: 'hidden',
													}}
												>
													<CustomScrollbar
														className="w-full h-full"
														thumbWidth={2}
														thumbColor="#000000"
														offsetRight={-14}
														contentClassName="scrollbar-hide"
													>
														<div className="px-2 py-1">
															<div className="w-full text-[10px] leading-[1.3] text-black font-inter">
																{selectedMarker.metadata}
															</div>
														</div>
													</CustomScrollbar>
												</div>
											</div>
										</div>
									);
								}
								return (
									<div className="px-3 py-4 text-center text-[11px] text-gray-500 italic">
										No research data available for this contact
									</div>
								);
							}

							return (
								<div className="p-2 flex flex-col gap-2">
									{visibleBoxes.map((config) => (
										<div
											key={config.key}
											className="relative"
											style={{
												width: '100%',
												minHeight: '44px',
												backgroundColor: config.color,
												border: '2px solid #000000',
												borderRadius: '6px',
											}}
										>
											<div
												className="absolute font-inter font-bold"
												style={{
													top: '4px',
													left: '6px',
													fontSize: '10px',
													color: '#000000',
												}}
											>
												[{config.key}]
											</div>
											<div
												className="absolute overflow-hidden"
												style={{
													top: '50%',
													transform: 'translateY(-50%)',
													right: '6px',
													width: 'calc(100% - 36px)',
													minHeight: '36px',
													maxHeight: '36px',
													backgroundColor: '#FFFFFF',
													border: '1px solid #000000',
													borderRadius: '4px',
												}}
											>
												<div className="w-full h-full px-2 flex items-center overflow-hidden">
													<div
														className="w-full text-[10px] leading-[1.3] text-black font-inter"
														style={{
															display: '-webkit-box',
															WebkitLineClamp: 2,
															WebkitBoxOrient: 'vertical',
															overflow: 'hidden',
														}}
													>
														{metadataSections[config.key]}
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							);
						})()}
						{/* Pointer triangle */}
						<div
							className="absolute left-1/2 -translate-x-1/2"
							style={{
								bottom: '-10px',
								width: 0,
								height: 0,
								borderLeft: '10px solid transparent',
								borderRight: '10px solid transparent',
								borderTop: '10px solid #D8E5FB',
							}}
						/>
						<div
							className="absolute left-1/2 -translate-x-1/2"
							style={{
								bottom: '-14px',
								width: 0,
								height: 0,
								borderLeft: '12px solid transparent',
								borderRight: '12px solid transparent',
								borderTop: '12px solid black',
								zIndex: -1,
							}}
						/>
					</div>
				</div>
			)}
		</>
	);
};
