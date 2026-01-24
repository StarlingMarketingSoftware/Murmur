'use client';

import MuxPlayer from '@mux/mux-player-react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import MapDemo1 from '@/components/atoms/_svg/MapDemo1';
import WhatDemo from '@/components/atoms/_svg/WhatDemo';
import ZoomDemo from '@/components/atoms/_svg/ZoomDemo';

const videoStyle = {
  '--controls': 'none',
  '--play-button': 'none',
  '--center-play-button': 'none',
  '--mute-button': 'none',
  '--pip-button': 'none',
  '--airplay-button': 'none',
  '--cast-button': 'none',
  '--fullscreen-button': 'none',
  '--loading-indicator': 'none',
  '--dialog': 'none',
  '--title-display': 'none',
  '--duration-display': 'none',
  '--time-display': 'none',
  '--playback-rate-button': 'none',
  '--volume-range': 'none',
  '--time-range': 'none',
  '--captions-button': 'none',
  '--live-button': 'none',
  '--seek-backward-button': 'none',
  '--seek-forward-button': 'none',
  '--rendition-selectmenu': 'none',
  '--audio-track-selectmenu': 'none',
  '--media-background-color': 'transparent',
  backgroundColor: 'transparent',
  border: 'none',
  outline: 'none',
  boxShadow: 'none',
} as React.CSSProperties;

export default function MapPage() {
  return (
    <main className="relative bg-[#F5F5F7]">
      {/* Gradient overlay for first 1307px (outside `.landing-zoom-80` so it isn't scaled by `zoom`) */}
      <div
        // Offset by the navbar spacer height (h-12 = 48px) so the gradient starts at the true top of the page.
        className="absolute -top-12 left-0 w-full pointer-events-none z-0"
        style={{
          height: '1307px',
          background: 'linear-gradient(to bottom, #E6D6C6, #F5F5F7)',
        }}
      />

      <div className="landing-zoom-80 relative z-10">
        <div className="min-h-screen relative">
          <div className="relative flex justify-center pt-8 pb-6 lg:pt-[53px] lg:pb-0">
            <div className="w-[calc(100vw-32px)] max-w-[1464px] bg-[#F2FBFF] rounded-[22px] flex flex-col items-center gap-6 px-4 pt-6 pb-6 lg:w-[1464px] lg:h-[975px] lg:px-[46px] lg:pt-[30px] lg:pb-[30px]">
              <h1 className="font-inter font-extralight tracking-[0.19em] text-[#696969] text-center text-[40px] sm:text-[56px] lg:text-[65px] leading-none">
                Mapping
              </h1>
              <div className="w-full flex justify-center lg:mt-auto">
                <div className="w-full max-w-[1372px] rounded-[8px] border border-black overflow-hidden flex">
                  <MuxPlayer
                    style={{
                      ...videoStyle,
                      width: '100%',
                      aspectRatio: '16/9',
                    }}
                    playbackId="C02P1SQEGXOZ00sb2s9qZrhVGqhLqgBDNy014vrcueeGH4"
                    streamType="on-demand"
                    autoPlay="muted"
                    muted
                    loop
                    playsInline
                    nohotkeys
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Explore the Country */}
          {/* Mobile layout (match screenshot card style; avoid SVG clipping) */}
          <div className="relative md:hidden flex justify-center mt-10">
            <div
              className="w-[calc(100vw-32px)] max-w-[904px] flex flex-col gap-6"
              style={{
                maxWidth:
                  'min(904px, calc(100vw - 32px - env(safe-area-inset-left) - env(safe-area-inset-right)))',
              }}
            >
              <div className="bg-white rounded-[34px] px-8 pt-10 pb-12">
                <p className="font-inter font-bold text-[20px] text-black leading-tight">
                  Explore the Country
                </p>
                <p className="font-inter font-normal text-[16px] text-black mt-5 leading-[1.75] tracking-wide [word-spacing:3px] break-words">
                  Plan a city-wide tour in Los Angeles or Portland for a week of shows. Go explore 100,000+
                  contacts from the Pacific to the Atlantic.
                </p>
              </div>

              <div className="bg-[#F1F1F1] rounded-[34px] overflow-hidden">
                <MapDemo1
                  className="w-full h-auto block"
                  viewBox="0 0 508 287"
                  preserveAspectRatio="xMidYMid meet"
                />
              </div>
            </div>
          </div>

          {/* Wide layout (original design) */}
          <div className="relative hidden md:flex justify-center mt-[80px] px-4 overflow-visible map-feature-scale-wrapper map-feature-scale-wrapper--explore">
            <div className="map-feature-scale-inner w-[1403px] h-[455px] flex items-stretch gap-[14px]">
              <div className="w-[585px] h-[455px] bg-[#FFFFFF] rounded-[22px] px-[56px] pt-[62px] pb-[46px]"> 
                <p className="font-inter font-bold text-[23px] text-black">Explore the Country</p>
                
                <p className="font-inter text-[23px] text-black mt-[44px] pr-[56px] leading-[56px] tracking-wide [word-spacing:5px]">
                  Plan a city-wide tour in Los Angeles or Portland for a week of shows. Go explore 100,000+
                  contacts from the Pacific to the Atlantic.
                </p>
              </div>
              <div className="w-[804px] h-[455px] rounded-[22px] overflow-hidden">
                <MapDemo1 className="w-full h-full" viewBox="0 0 508 287" />
              </div>
            </div>
          </div>

          {/* All Data in One Place */}
          {/* Mobile layout (match screenshot card style; avoid SVG clipping) */}
          <div className="relative md:hidden flex justify-center mt-12">
            <div
              className="w-[calc(100vw-32px)] max-w-[904px] flex flex-col gap-6"
              style={{
                maxWidth:
                  'min(904px, calc(100vw - 32px - env(safe-area-inset-left) - env(safe-area-inset-right)))',
              }}
            >
              <div className="bg-white rounded-[34px] px-8 pt-10 pb-12">
                <p className="font-inter font-bold text-[20px] text-black leading-tight">
                  All Data in One Place
                </p>
                <p className="font-inter font-normal text-[16px] text-black mt-5 leading-[1.75] tracking-wide [word-spacing:3px] break-words">
                  Filter each search by category, whether you&apos;re looking for coffee shops for gigs or radio stations for airplay.
                </p>
              </div>

              <div
                className="rounded-[34px] p-6 sm:p-8 flex justify-center overflow-visible"
                style={{
                  background: 'linear-gradient(180deg, #C3E8C9 0%, #AFF1B8 100%)',
                }}
              >
                <WhatDemo className="w-full h-auto max-w-[520px] -translate-x-[11.75%]" />
              </div>
            </div>
          </div>

          {/* Wide layout (updated design) */}
          <div className="relative hidden md:flex justify-center mt-[81px] px-4 overflow-visible map-feature-scale-wrapper map-feature-scale-wrapper--all-data">
            <div className="map-feature-scale-inner w-[1428px] flex items-stretch gap-[15px]">
              <div
                className="w-[702px] h-[532px] rounded-[22px] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(180deg, #C3E8C9 0%, #AFF1B8 100%)',
                }}
              >
                <WhatDemo className="w-[680px] h-auto -translate-x-[11.75%]" />
              </div>

              <div className="w-[711px] h-[532px] bg-white rounded-[22px] px-[60px] pt-[62px] pb-[46px]">
                <p className="font-inter font-bold text-[24px] text-black">All Data in One Place</p>
                <p className="font-inter text-[23px] text-black mt-[44px] pr-[24px] leading-[56px] tracking-wide [word-spacing:5px]">
                  Filter each search by category, whether you&apos;re looking for coffee shops for gigs or radio stations for airplay.
                </p>
              </div>
            </div>
          </div>

          {/* Zoom Closer, See the Details */}
          {/* Mobile layout (match the card style above; avoid SVG clipping) */}
          <div className="relative md:hidden flex justify-center mt-12">
            <div
              className="w-[calc(100vw-32px)] max-w-[904px] flex flex-col gap-6"
              style={{
                maxWidth:
                  'min(904px, calc(100vw - 32px - env(safe-area-inset-left) - env(safe-area-inset-right)))',
              }}
            >
              <div className="bg-white rounded-[34px] px-8 pt-10 pb-12">
                <p className="font-inter font-bold text-[20px] text-black leading-tight">
                  Zoom Closer, See the Details
                </p>
                <p className="font-inter font-normal text-[16px] text-black mt-5 leading-[1.75] tracking-wide [word-spacing:3px] break-words">
                  Zoom in on San Francisco and see more contacts appear. The closer you get, the more you see.
                </p>
              </div>

              <div className="rounded-[22px] overflow-hidden">
                <ZoomDemo
                  className="w-full h-auto block"
                  viewBox="0 0 561 287"
                  preserveAspectRatio="xMidYMid meet"
                />
              </div>
            </div>
          </div>

          {/* Wide layout (updated design) */}
          <div className="relative hidden md:flex justify-center mt-[119px] px-4 overflow-visible map-feature-scale-wrapper map-feature-scale-wrapper--zoom">
            <div className="map-feature-scale-inner w-[1404px] h-[470px] flex items-stretch gap-[15px]">
              <div className="w-[469px] h-[470px] bg-white rounded-[22px] px-[56px] pt-[62px] pb-[46px]">
                <p className="font-inter font-bold text-[24px] text-black">Zoom Closer, See the Details:</p>
                <p className="font-inter text-[23px] text-black mt-[44px] leading-[56px] tracking-wide [word-spacing:5px]">
                  Zoom in on San Francisco and see more contacts appear. The closer you get, the more you see.
                </p>
              </div>

              <div className="w-[920px] h-[470px] rounded-[22px] overflow-hidden">
                <ZoomDemo
                  className="w-full h-full"
                  viewBox="0 0 561 287"
                  preserveAspectRatio="none"
                />
              </div>
            </div>
          </div>
          <div className="relative flex flex-col items-center justify-center pt-14 pb-16 sm:pt-16 sm:pb-20 lg:py-0 lg:h-[660px]">
            <p className="font-inter font-normal text-[clamp(32px,9vw,62px)] text-black text-center leading-[1.05]">
              Try Murmur Now
            </p>
            <Link
              href={urls.freeTrial.index}
              className="landing-bottom-free-trial-btn flex items-center justify-center cursor-pointer text-center text-white font-inter font-medium text-[14px]"
              style={{
                marginTop: '32px',
                width: '219px',
                height: '33px',
              }}
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
