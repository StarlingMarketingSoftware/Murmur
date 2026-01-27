'use client';

import React from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import DraftingDemo from '@/components/atoms/_svg/DraftingDemo';
import ProfileDemo from '@/components/atoms/_svg/ProfileDemo';
import ModesDemo from '@/components/atoms/_svg/ModesDemo';
import DraftPreviewDemo from '@/components/atoms/_svg/DraftPreviewDemo';
import { ScaledToFit } from '@/components/atoms/ScaledToFit';
import { FadeInUp } from '@/components/animations/FadeInUp';

export default function DraftingPage() {
  React.useEffect(() => {
    const footer = document.querySelector('footer') as HTMLElement | null;
    const prevFooterDisplay = footer?.style.display ?? '';
    const prevBodyZoom = document.body.style.getPropertyValue('zoom');

    if (footer) {
      footer.style.display = 'none';
    }

    // Make this route render at ~80% browser zoom (desktop only).
    // Mobile devices have touch scrolling issues with zoom, so skip it.
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      document.body.style.setProperty('zoom', '0.8');
    }

    return () => {
      const footer = document.querySelector('footer') as HTMLElement | null;
      if (footer) {
        footer.style.display = prevFooterDisplay;
      }

      if (prevBodyZoom) {
        document.body.style.setProperty('zoom', prevBodyZoom);
      } else {
        document.body.style.removeProperty('zoom');
      }
    };
  }, []);

  return (
    <main className="relative bg-[#F5F5F7] overflow-x-hidden landing-page">
      {/* Gradient overlay for first 1935px (offset by navbar spacer height, h-12 = 48px) */}
      <div
        className="absolute -top-12 left-0 w-full pointer-events-none z-0"
        style={{
          height: '1935px',
          background: 'linear-gradient(to bottom, #D2F2DE, #F5F5F7)',
        }}
      />
      <div className="relative z-10 min-h-screen">
      <div className="relative flex justify-center pt-8 pb-6 lg:pt-[53px] lg:pb-0">
        <FadeInUp className="w-[calc(100vw-32px)] max-w-[1352px] bg-[#F2FBFF] rounded-[22px] flex flex-col items-center gap-6 px-4 pt-6 pb-6 lg:w-[1352px] lg:h-[823px] lg:px-[46px] lg:pt-[30px] lg:pb-[30px]">
          <h1 className="font-inter font-extralight tracking-[0.19em] text-[#696969] text-center text-[40px] sm:text-[56px] lg:text-[65px] leading-none">
            Drafting
          </h1>
          <div className="w-full flex-1 min-h-0 flex justify-center">
            <DraftingDemo className="w-full h-auto lg:h-full" />
          </div>
        </FadeInUp>
      </div>
      {/* Tell your story */}
      {/* Narrow layout (stacked) */}
      <div className="hidden max-[1193px]:block w-full mt-16 sm:mt-[192px] px-4 sm:px-6">
        <div className="mx-auto w-full max-w-[686px] flex flex-col gap-6">
          <FadeInUp className="bg-white rounded-[34px] px-8 pt-10 pb-12">
            <p className="font-inter font-bold text-[20px] text-black leading-tight">Tell your story</p>
            <p className="font-inter font-normal text-[16px] text-black mt-5 leading-[1.75] tracking-wide [word-spacing:3px] break-words">
              When you add basic information to your profile, it gives context to the drafting. This creates much better results that incorporate
              your real bio, links, booking date range, and any custom instructions.
            </p>
          </FadeInUp>

          <FadeInUp
            delay={0.05}
            className="rounded-[34px] bg-gradient-to-b from-[#E1D5FF] to-[#F1ECFB] px-8 pt-10 pb-12 flex justify-center"
          >
            <ScaledToFit baseWidth={394} baseHeight={366}>
              <ProfileDemo />
            </ScaledToFit>
          </FadeInUp>
        </div>
      </div>

      {/* Wide layout */}
      <div className="relative flex max-[1193px]:hidden justify-center mt-[192px] px-4 overflow-visible drafting-feature-scale-wrapper drafting-feature-scale-wrapper--tell">
        <div className="drafting-feature-scale-inner flex w-[1355px] h-[424px] gap-[13px]">
          <FadeInUp className="w-[752px] h-[424px] rounded-[22px] bg-white px-[86px] pt-[74px]">
            <p className="font-inter font-bold text-[24px] text-black">Tell your story</p>
            <p className="font-inter text-[23px] text-black mt-[24px] leading-[56px] tracking-wide [word-spacing:5px]">
              When you add basic information to your profile, it gives context to the drafting. This creates much better results that incorporate
              your real bio, links, booking date range, and any custom instructions.
            </p>
          </FadeInUp>
          <FadeInUp
            delay={0.05}
            className="w-[590px] h-[424px] rounded-[22px] bg-gradient-to-b from-[#E1D5FF] to-[#F1ECFB] flex items-center justify-center"
          >
            <ProfileDemo />
          </FadeInUp>
        </div>
      </div>
      {/* Drafting Modes */}
      {/* Narrow layout (mobile) */}
      <div className="hidden max-[1193px]:block w-full mt-14 sm:mt-[146px] px-4 sm:px-6">
        <div className="mx-auto w-full max-w-[686px] flex flex-col gap-6">
          <FadeInUp className="bg-white rounded-[34px] px-8 pt-10 pb-12">
            <p className="font-inter font-bold text-[20px] text-black leading-tight">
              Drafting Modes
            </p>
            <p className="font-inter font-normal text-[16px] text-black mt-5 leading-[1.75] tracking-wide [word-spacing:3px] break-words">
              Murmur has three distinct drafting modes: Auto, Manual, and Hybrid. Auto drafts based on the full range of information it has
              provided, such as the user profile, the contact research, contact location, and booking date range. In contrast to this, manual mode
              is a complete text editor with full customization. Then for edge cases, there&apos;s hybrid.
            </p>
          </FadeInUp>

          <FadeInUp
            delay={0.05}
            className="rounded-[34px] bg-gradient-to-b from-[#ECFFF9] to-[#BFEADC] px-8 pt-10 pb-12"
          >
            <div className="space-y-16">
              <div>
                <p className="font-inter font-bold text-[20px] xs:text-[22px] sm:text-[24px] text-black leading-tight">Auto</p>
                <div className="mt-6">
                  <ScaledToFit baseWidth={329} baseHeight={466}>
                    <ModesDemo width={329} height={466} viewBox="0 0 329 466" preserveAspectRatio="xMinYMin meet" />
                  </ScaledToFit>
                </div>
              </div>

              <div>
                <p className="font-inter font-bold text-[20px] xs:text-[22px] sm:text-[24px] text-black leading-tight">Manual Mode</p>
                <div className="mt-6">
                  <ScaledToFit baseWidth={329} baseHeight={466}>
                    <ModesDemo width={329} height={466} viewBox="423 0 329 466" preserveAspectRatio="xMinYMin meet" />
                  </ScaledToFit>
                </div>
              </div>

              <div>
                <p className="font-inter font-bold text-[20px] xs:text-[22px] sm:text-[24px] text-black leading-tight">Hybrid Mode</p>
                <div className="mt-6">
                  <ScaledToFit baseWidth={329} baseHeight={466}>
                    <ModesDemo width={329} height={466} viewBox="846 0 329 466" preserveAspectRatio="xMinYMin meet" />
                  </ScaledToFit>
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </div>

      {/* Wide layout */}
      <div className="relative flex max-[1193px]:hidden justify-center mt-[146px] px-4 overflow-visible drafting-feature-scale-wrapper drafting-feature-scale-wrapper--modes">
        <div className="drafting-feature-scale-inner w-[1354px] h-[895px] flex flex-col gap-[13px]">
          <FadeInUp className="w-full h-[535px] rounded-[22px] bg-gradient-to-b from-[#ECFFF9] to-[#BFEADC] flex items-center justify-center overflow-hidden">
            <ModesDemo className="max-w-full max-h-full" />
          </FadeInUp>

          <FadeInUp delay={0.05} className="w-full h-[347px] rounded-[22px] bg-white px-[58px] pt-[44px]">
            <p className="font-inter font-bold text-[24px] text-black">Drafting Modes</p>
            <p className="font-inter text-[23px] text-black mt-[24px] leading-[56px] tracking-wide [word-spacing:5px]">
              Murmur has three distinct drafting modes: Auto, Manual, and Hybrid. Auto drafts based on the full range of information it has
              provided, such as the user profile, the contact research, contact location, and booking date range. In contrast to this, manual mode
              is a complete text editor with full customization. Then for edge cases, there&apos;s hybrid.
            </p>
          </FadeInUp>
        </div>
      </div>
      {/* Built-in variation */}
      {/* Narrow layout (stacked, show both preview variants) */}
      <div className="hidden max-[1193px]:block w-full mt-16 sm:mt-[181px] px-4 sm:px-6">
        <div className="mx-auto w-full max-w-[686px] flex flex-col gap-6">
          <FadeInUp className="bg-white rounded-[34px] px-8 pt-10 pb-12">
            <p className="font-inter font-bold text-[20px] text-black leading-tight">
              Built-in variation
            </p>
            <p className="font-inter font-normal text-[16px] text-black mt-5 leading-[1.75] tracking-wide [word-spacing:3px] break-words">
              When drafting in Auto mode, we&apos;ve done extensive work to ensure that no two emails are identical, often drafting in fairly
              different structures. This allows you to embody a more unique voice for each contact you reach out to.
            </p>
          </FadeInUp>

          <FadeInUp
            delay={0.05}
            className="rounded-[34px] px-8 pt-10 pb-12"
            style={{
              background: 'linear-gradient(229deg, #EFFDFF -10%, #C2E9EF 90%)',
            }}
          >
            <div className="space-y-10">
              <ScaledToFit baseWidth={393} baseHeight={555}>
                <DraftPreviewDemo width={393} height={555} viewBox="0 0 393 555" preserveAspectRatio="xMinYMin meet" />
              </ScaledToFit>

              <ScaledToFit baseWidth={393} baseHeight={555}>
                <DraftPreviewDemo width={393} height={555} viewBox="410 0 393 555" preserveAspectRatio="xMinYMin meet" />
              </ScaledToFit>
            </div>
          </FadeInUp>
        </div>
      </div>

      {/* Wide layout (original design) */}
      <div className="relative flex max-[1193px]:hidden justify-center mt-[181px] px-4 overflow-visible drafting-feature-scale-wrapper drafting-feature-scale-wrapper--variation">
        <div className="drafting-feature-scale-inner flex w-[1354px] h-[627px] gap-[7px]">
          <FadeInUp className="w-[527px] h-[627px] rounded-[22px] bg-white px-[58px] pt-[58px]">
            <p className="font-inter font-bold text-[24px] text-black">Built-in variation</p>
            <p className="font-inter text-[23px] text-black mt-[44px] leading-[56px] tracking-wide [word-spacing:5px]">
              When drafting in Auto mode, we&apos;ve done extensive work to ensure that no two emails are identical, often drafting in fairly
              different structures. This allows you to embody a more unique voice for each contact you reach out to.
            </p>
          </FadeInUp>

          <FadeInUp
            delay={0.05}
            className="w-[820px] h-[627px] rounded-[22px] flex items-center justify-center overflow-hidden"
            style={{
              background: 'linear-gradient(229deg, #EFFDFF -10%, #C2E9EF 90%)',
            }}
          >
            <DraftPreviewDemo className="max-w-full max-h-full" />
          </FadeInUp>
        </div>
      </div>
      <FadeInUp className="flex flex-col items-center justify-center pt-14 pb-16 sm:pt-16 sm:pb-20 lg:py-0 lg:h-[660px]">
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
      </FadeInUp>
      </div>
    </main>
  );
}
