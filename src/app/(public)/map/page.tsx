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
          <div className="relative w-full flex items-start justify-center pt-8 pb-6 lg:h-[264px] lg:items-center lg:pt-0 lg:pb-0">
            <h1 className="font-inter text-center text-[40px] sm:text-[56px] lg:text-[65px] leading-none">
              Mapping
            </h1>
          </div>
          <div className="relative flex justify-center">
            <MuxPlayer
              style={{
                ...videoStyle,
                width: 'calc(100vw - 8px)',
                maxWidth: '1372px',
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

          {/* Explore the Country */}
          {/* Narrow layout (match landing page ultra-narrow typography/padding) */}
          <div className="relative lg:hidden w-full mt-10 px-[14%]">
            <div className="mx-auto w-full max-w-[904px] bg-[#FAFAFA]">
              <div className="bg-[#EFEFEF] rounded-[8px] px-6 py-8">
                <p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
                  Explore the Country
                </p>
                <p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight mt-2 break-words">
                  Plan a city-wide tour in Los Angeles or Portland for a week of shows. Go explore 100,000+
                  contacts from the Pacific to the Atlantic.
                </p>
              </div>

              <div className="mt-6 bg-[#F1F1F1] rounded-[8px] px-6 pt-8 pb-10 overflow-hidden flex justify-center">
                <MapDemo1 className="w-full h-auto max-w-[508px]" />
              </div>
            </div>
          </div>

          {/* Wide layout (original design) */}
          <div className="relative hidden lg:flex justify-center mt-[196px] px-4">
            <div className="w-full max-w-[1347px] bg-[#FAFAFA] flex items-stretch flex-row h-[364px]">
              <div className="w-full max-w-[678px] bg-[#EFEFEF] rounded-[6px] ml-[24px] my-[17px] px-[56px] py-[46px] h-[327px]">
                <p className="font-inter font-bold text-[24px] text-black">Explore the Country</p>
                <p className="font-inter text-[23px] text-black mt-[24px] pr-[56px] leading-[45px] tracking-wide [word-spacing:5px]">
                  Plan a city-wide tour in Los Angeles or Portland for a week of shows. Go explore 100,000+
                  contacts from the Pacific to the Atlantic.
                </p>
              </div>
              <div className="flex justify-center ml-auto mr-[59px] self-center">
                <MapDemo1 />
              </div>
            </div>
          </div>

          {/* All Data in One Place */}
          {/* Narrow layout (match landing page ultra-narrow typography/padding) */}
          <div className="relative lg:hidden w-full mt-12 px-[14%]">
            <div className="mx-auto w-full max-w-[904px] bg-[#FAFAFA]">
              <div className="bg-[#EFEFEF] rounded-[8px] px-6 py-8">
                <p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
                  All Data in One Place:
                </p>
                <p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight mt-2 break-words">
                  Filter each search by category, whether you&apos;re looking for coffee shops for gigs or radio stations for airplay.
                </p>
              </div>

              <div className="mt-6 bg-[#F1F1F1] rounded-[8px] px-6 pt-8 pb-10 overflow-hidden flex justify-center">
                <WhatDemo className="w-full h-auto max-w-[450px] -translate-x-[11.75%]" />
              </div>
            </div>
          </div>

          {/* Wide layout (original design) */}
          <div className="relative hidden lg:flex justify-center mt-[81px] px-4">
            <div className="w-full max-w-[1347px] bg-[#FAFAFA] flex items-stretch flex-row-reverse h-[364px]">
              <div className="w-full max-w-[678px] bg-[#EFEFEF] rounded-[6px] mr-[23px] my-[17px] px-[56px] py-[46px] h-[327px]">
                <p className="font-inter font-bold text-[24px] text-black">All Data in One Place:</p>
                <p className="font-inter text-[23px] text-black mt-[24px] pr-[56px] leading-[45px] tracking-wide [word-spacing:5px]">
                  Filter each search by category, whether you&apos;re looking for coffee shops for gigs or radio stations for airplay.
                </p>
              </div>
              <div className="flex justify-center mr-auto ml-[55px] self-center">
                <WhatDemo />
              </div>
            </div>
          </div>

          {/* Zoom Closer, See the Details */}
          {/* Narrow layout (match landing page ultra-narrow typography/padding) */}
          <div className="relative lg:hidden w-full mt-12 px-[14%]">
            <div className="mx-auto w-full max-w-[904px] bg-[#FAFAFA]">
              <div className="bg-[#EFEFEF] rounded-[8px] px-6 py-8">
                <p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
                  Zoom Closer, See the Details:
                </p>
                <p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight mt-2 break-words">
                  Zoom in on San Francisco and see more contacts appear. The closer you get, the more you see.
                </p>
              </div>

              <div className="mt-6 bg-[#F1F1F1] rounded-[8px] px-6 pt-8 pb-10 overflow-hidden flex justify-center">
                <ZoomDemo className="w-full h-auto max-w-[561px]" />
              </div>
            </div>
          </div>

          {/* Wide layout (original design) */}
          <div className="relative hidden lg:flex justify-center mt-[119px] px-4">
            <div className="w-full max-w-[1347px] bg-[#FAFAFA] flex items-stretch flex-row h-[364px]">
              <div className="w-full max-w-[678px] bg-[#EFEFEF] rounded-[6px] ml-[24px] my-[17px] px-[56px] py-[46px] h-[327px]">
                <p className="font-inter font-bold text-[24px] text-black">Zoom Closer, See the Details:</p>
                <p className="font-inter text-[23px] text-black mt-[24px] pr-[56px] leading-[45px] tracking-wide [word-spacing:5px]">
                  Zoom in on San Francisco and see more contacts appear. The closer you get, the more you see.
                </p>
              </div>
              <div className="flex justify-center ml-auto mr-[24px] self-center">
                <ZoomDemo className="w-full max-w-[561px] h-auto" />
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
