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

    if (footer) {
      footer.style.display = 'none';
    }

    const clearInlineScrollLocks = () => {
      // Clear any common inline scroll locks (overflow hidden, fixed body, etc).
      document.body.style.overflow = '';
      document.body.style.overflowX = '';
      document.body.style.overflowY = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
    };

    // Defensive: if any prior view left inline scroll locks behind (overflow hidden, fixed body, etc),
    // clear them so this marketing page always remains scrollable on mobile Safari.
    try {
      clearInlineScrollLocks();
      // This page no longer uses inline body zoom; ensure nothing stale persists.
      document.body.style.removeProperty('zoom');
    } catch {
      // ignore
    }

    // Desktop "compact" (80%) scaling.
    // On touch devices (iOS Safari/iPadOS), root-level scaling can break touch scrolling.
    const compactMql = window.matchMedia('(min-width: 1024px)');
    const touchMql = window.matchMedia('(hover: none) and (pointer: coarse)');
    const syncCompactClass = () => {
      // `hover/pointer` media queries are not fully reliable across Safari versions,
      // so also fall back to touch-point detection.
      const isTouchDevice =
        touchMql.matches ||
        (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
        'ontouchstart' in window;

      if (compactMql.matches && !isTouchDevice) {
        document.documentElement.classList.add('murmur-drafting-compact');
      } else {
        document.documentElement.classList.remove('murmur-drafting-compact');
      }
    };

    syncCompactClass();
    // Safari < 14 uses addListener/removeListener.
    if (typeof compactMql.addEventListener === 'function') {
      compactMql.addEventListener('change', syncCompactClass);
    } else {
      compactMql.addListener(syncCompactClass);
    }
    if (typeof touchMql.addEventListener === 'function') {
      touchMql.addEventListener('change', syncCompactClass);
    } else {
      touchMql.addListener(syncCompactClass);
    }
    // Extra redundancy: make sure rotation/resize never leaves compact scaling applied on touch devices.
    window.addEventListener('resize', syncCompactClass, { passive: true });
    window.addEventListener('orientationchange', syncCompactClass);

    const isAnyModalOpen = () => {
      // Generic modal detection (covers Radix + most third-party modals, including Clerk).
      try {
        return Boolean(
          document.querySelector(
            '[aria-modal="true"], [data-slot="dialog-content"][data-state="open"]'
          )
        );
      } catch {
        return false;
      }
    };

    const isHardScrollLocked = () => {
      const body = document.body.style;
      const html = document.documentElement.style;
      // We treat these as "hard" locks that should never persist on this marketing page.
      // (Navbar mobile menu only sets `body.style.overflow`, so it won't trigger this.)
      return (
        body.position === 'fixed' ||
        body.touchAction === 'none' ||
        body.top !== '' ||
        html.overflow === 'hidden'
      );
    };

    const unlockIfStuck = () => {
      if (isAnyModalOpen()) return;
      if (!isHardScrollLocked()) return;
      try {
        clearInlineScrollLocks();
      } catch {
        // ignore
      }
      // Ensure we also don't accidentally re-apply compact scaling on touch devices.
      syncCompactClass();
    };

    // Watch for any code leaving scroll locks behind after mount (e.g., modals/overlays).
    let rafId: number | null = null;
    const scheduleUnlockCheck = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        unlockIfStuck();
      });
    };

    const bodyObserver = new MutationObserver(scheduleUnlockCheck);
    const htmlObserver = new MutationObserver(scheduleUnlockCheck);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    htmlObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    // Also re-check on common Safari lifecycle edges.
    const onVisibilityChange = () => {
      if (!document.hidden) unlockIfStuck();
    };
    window.addEventListener('pageshow', unlockIfStuck);
    window.addEventListener('focus', unlockIfStuck);
    document.addEventListener('visibilitychange', onVisibilityChange);
    // If the user tries to interact and we're locked, recover immediately.
    window.addEventListener('touchstart', unlockIfStuck, { passive: true });

    return () => {
      const footer = document.querySelector('footer') as HTMLElement | null;
      if (footer) {
        footer.style.display = prevFooterDisplay;
      }

      if (typeof compactMql.removeEventListener === 'function') {
        compactMql.removeEventListener('change', syncCompactClass);
      } else {
        compactMql.removeListener(syncCompactClass);
      }
      if (typeof touchMql.removeEventListener === 'function') {
        touchMql.removeEventListener('change', syncCompactClass);
      } else {
        touchMql.removeListener(syncCompactClass);
      }
      window.removeEventListener('resize', syncCompactClass);
      window.removeEventListener('orientationchange', syncCompactClass);
      window.removeEventListener('pageshow', unlockIfStuck);
      window.removeEventListener('focus', unlockIfStuck);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('touchstart', unlockIfStuck);
      bodyObserver.disconnect();
      htmlObserver.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);

      document.documentElement.classList.remove('murmur-drafting-compact');
    };
  }, []);

  return (
    <main className="relative bg-[#F5F5F7] overflow-x-hidden landing-page">
      {/* Gradient overlay for first 1935px */}
      <div
        className="fixed top-0 left-0 w-full pointer-events-none z-0"
        style={{
          height: '1935px',
          background: 'linear-gradient(to bottom, #D2F2DE, #F5F5F7)',
        }}
      />
      <div className="relative z-10 min-h-screen">
      <div className="relative flex justify-center pt-20 pb-6 lg:pt-[101px] lg:pb-0">
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
      <div className="w-full mt-16 sm:mt-[192px] px-4 sm:px-6 min-[1194px]:hidden">
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
            className="w-full rounded-[22px] overflow-hidden flex items-center justify-center px-4 py-6"
            style={{
              background: 'linear-gradient(to bottom, #E1D5FF, #F1ECFB)',
            }}
          >
            {/* Avoid transform-scaling here: iOS Safari can drop SVG filter layers when scaled via CSS transforms. */}
            <div className="w-full max-w-[394px] aspect-[394/366]">
              <ProfileDemo
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              />
            </div>
          </FadeInUp>
        </div>
      </div>

      {/* Wide layout */}
      <div className="relative hidden min-[1194px]:flex justify-center mt-[192px] px-4 overflow-visible drafting-feature-scale-wrapper drafting-feature-scale-wrapper--tell">
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
      <div className="w-full mt-14 sm:mt-[146px] px-4 sm:px-6 min-[1194px]:hidden">
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
            className="w-full rounded-[22px] overflow-hidden px-8 pt-10 pb-12"
            style={{
              background: 'linear-gradient(to bottom, #ECFFF9, #BFEADC)',
            }}
          >
            <div className="space-y-16">
              <div>
                <p className="relative top-[12px] font-inter font-bold text-[18px] xs:text-[20px] sm:text-[22px] text-black leading-tight">Auto</p>
                <div className="mt-6">
                  <ScaledToFit baseWidth={329} baseHeight={466}>
                    <ModesDemo width={329} height={466} viewBox="0 0 329 466" preserveAspectRatio="xMinYMin meet" />
                  </ScaledToFit>
                </div>
              </div>

              <div>
                <p className="relative top-[12px] font-inter font-bold text-[18px] xs:text-[20px] sm:text-[22px] text-black leading-tight">Manual Mode</p>
                <div className="mt-6">
                  <ScaledToFit baseWidth={329} baseHeight={466}>
                    <ModesDemo width={329} height={466} viewBox="423 0 329 466" preserveAspectRatio="xMinYMin meet" />
                  </ScaledToFit>
                </div>
              </div>

              <div>
                <p className="relative top-[12px] font-inter font-bold text-[18px] xs:text-[20px] sm:text-[22px] text-black leading-tight">Hybrid Mode</p>
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
      <div className="relative hidden min-[1194px]:flex justify-center mt-[146px] px-4 overflow-visible drafting-feature-scale-wrapper drafting-feature-scale-wrapper--modes">
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
      <div className="w-full mt-16 sm:mt-[181px] px-4 sm:px-6 min-[1194px]:hidden">
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
            className="w-full rounded-[22px] px-8 pt-10 pb-12"
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
      <div className="relative hidden min-[1194px]:flex justify-center mt-[181px] px-4 overflow-visible drafting-feature-scale-wrapper drafting-feature-scale-wrapper--variation">
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
