'use client';

import React from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import ResearchDemo from '@/components/atoms/_svg/ResearchDemo';
import PanelDemo from '@/components/atoms/_svg/PanelDemo';
import SampleEmail from '@/components/atoms/_svg/sampleEmail';
import { FadeInUp } from '@/components/animations/FadeInUp';

export default function ResearchPage() {
  React.useEffect(() => {
    const footer = document.querySelector('footer') as HTMLElement | null;
    const prevFooterDisplay = footer?.style.display ?? '';

    if (footer) footer.style.display = 'none';

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
      document.documentElement.style.overflowX = '';
      document.documentElement.style.overflowY = '';
    };

    const clearLeakedAppScrollClasses = () => {
      // Defensive: if a user navigates here from an app page (or via Safari BFCache),
      // some root classes can leak and *hard lock* scrolling on mobile.
      try {
        document.documentElement.classList.remove(
          'murmur-compact',
          'murmur-campaign-compact',
          'murmur-campaign-scrollable',
          'murmur-campaign-force-transform'
        );
        // Lenis can toggle this when scrolling is stopped; if it leaks, scrolling can appear "frozen".
        document.documentElement.classList.remove('lenis-stopped');
        document.body.classList.remove('lenis-stopped');

        // Campaign zoom var can also leak; clear it for this marketing page.
        document.documentElement.style.removeProperty('--murmur-campaign-zoom');
      } catch {
        // ignore
      }
    };

    // Defensive: if any prior view left inline scroll locks behind (overflow hidden, fixed body, etc),
    // clear them so this marketing page always remains scrollable on mobile Safari.
    try {
      clearInlineScrollLocks();
      clearLeakedAppScrollClasses();
      // This page does not use inline body zoom; ensure nothing stale persists.
      document.body.style.removeProperty('zoom');
    } catch {
      // ignore
    }

    // Only apply the compact (zoom/scale) treatment on desktop *non-touch* devices.
    // On iOS Safari/iPadOS, root-level scaling can break touch scrolling (and can fully lock scrolling).
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
        document.documentElement.classList.add('murmur-research-compact');
      } else {
        document.documentElement.classList.remove('murmur-research-compact');
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

    const isMobileMenuOpen = () => {
      // Navbar exposes this attribute; use it so we don't fight legitimate scroll locks.
      try {
        return Boolean(document.querySelector('[data-mobile-menu-open="true"]'));
      } catch {
        return false;
      }
    };

    const isOverlayOpen = () => isAnyModalOpen() || isMobileMenuOpen();

    const isHardScrollLocked = () => {
      const bodyInline = document.body.style;
      const htmlInline = document.documentElement.style;

      const hasLeakedScrollClasses =
        document.documentElement.classList.contains('murmur-compact') ||
        document.documentElement.classList.contains('murmur-campaign-compact') ||
        document.documentElement.classList.contains('lenis-stopped');

      const overflowLockedInline =
        bodyInline.overflow === 'hidden' ||
        bodyInline.overflowY === 'hidden' ||
        bodyInline.overflow === 'clip' ||
        bodyInline.overflowY === 'clip' ||
        htmlInline.overflow === 'hidden' ||
        htmlInline.overflowY === 'hidden' ||
        htmlInline.overflow === 'clip' ||
        htmlInline.overflowY === 'clip';

      const positionOrTouchLocked =
        bodyInline.position === 'fixed' || bodyInline.top !== '' || bodyInline.touchAction === 'none';

      // NOTE: Avoid `getComputedStyle()` here — it can introduce noticeable touch-scroll lag
      // on iOS Safari (especially at the very top/bottom where users do short gestures).
      // For this marketing page, hard locks have been observed to come from inline styles
      // or leaked root classes (handled above), which MutationObservers also catch.
      return hasLeakedScrollClasses || overflowLockedInline || positionOrTouchLocked;
    };

    const unlockIfStuck = () => {
      if (isOverlayOpen()) return;
      if (!isHardScrollLocked()) return;
      try {
        clearInlineScrollLocks();
        clearLeakedAppScrollClasses();
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
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

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
      if (footer) footer.style.display = prevFooterDisplay;

      document.documentElement.classList.remove('murmur-research-compact');

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
    };
  }, []);

  return (
    <main className="relative bg-[#F5F5F7] overflow-x-hidden landing-page">
      {/* Gradient overlay for first 1935px */}
      <div
        className="absolute top-0 left-0 w-full pointer-events-none z-0"
        style={{
          height: '1935px',
          background: 'linear-gradient(to bottom, #D3F4FF, #F5F5F7)',
        }}
      />

      <div className="relative z-10 min-h-screen">
        <div className="relative flex justify-center pt-16 pb-6 lg:pt-[100px] lg:pb-0">
          <FadeInUp className="w-[calc(100vw-32px)] max-w-[966px] bg-[#F2FBFF] rounded-[22px] flex flex-col items-center gap-6 px-4 pt-6 pb-6 lg:w-[966px] lg:h-[823px] lg:px-[46px] lg:pt-[30px] lg:pb-[30px]">
            <h1 className="font-inter font-extralight tracking-[0.19em] text-[#696969] text-center text-[40px] sm:text-[56px] lg:text-[65px] leading-none">
              Research
            </h1>
            <div className="w-full flex-1 min-h-0 flex justify-center">
              <ResearchDemo className="w-full h-auto lg:h-full" />
            </div>
          </FadeInUp>
        </div>
      
      {/* Mobile Layout (match the screenshot card styling/typography) */}
      <div className="lg:hidden w-full mt-14 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-[686px] flex flex-col gap-6">
          <FadeInUp className="bg-white rounded-[22px] px-6 py-10 sm:px-10">
            <p className="font-inter font-bold text-[20px] text-black text-left leading-tight">
              From Booking Schedules to Genre
            </p>
            <p className="font-inter font-normal text-[16px] text-black text-left mt-5 leading-[1.75] tracking-wide [word-spacing:3px] break-words">
              For every contact, we provide detailed descriptions, including facts like what times a venue in Eastern Pennsylvania is booking shows, and what genres they book. See the research at any point in the tool, from searching the map up to sending your first email.
            </p>
          </FadeInUp>

          <FadeInUp
            delay={0.05}
            className="bg-[#D3F4FF] rounded-[22px] px-4 pt-8 pb-10 sm:px-10 overflow-hidden flex justify-center"
          >
            <PanelDemo className="w-full h-auto max-w-[424px]" />
          </FadeInUp>

          <FadeInUp delay={0.1} className="bg-white rounded-[22px] px-6 py-10 sm:px-10">
            <p className="font-inter font-bold text-[20px] text-black text-left leading-tight">
              Know the History
            </p>
            <p className="font-inter font-normal text-[16px] text-black text-left mt-5 leading-[1.75] tracking-wide [word-spacing:3px] break-words">
              The research goes beyond the basics and into the culture of each location. Know if a brewery in West Virginia is serving hikers, or if a coffee shop in Illinois hosts an outdoor summer concert series. We care about the details.
            </p>
          </FadeInUp>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="relative hidden lg:flex justify-center mt-[180px] px-4 overflow-visible research-feature-scale-wrapper research-feature-scale-wrapper--top">
        <div className="research-feature-scale-inner flex w-[1352px] h-[945px] gap-[20px]">
          <FadeInUp className="flex h-full w-[745px] flex-col gap-[21px]">
            <div className="h-[462px] w-[745px] rounded-[22px] bg-white px-[56px] pt-[48px]">
              <p className="font-inter font-bold text-[24px] text-black">
                From Booking Schedules to Genre
              </p>
              <p className="font-inter text-[21px] text-black mt-[32px] pr-[24px] leading-[57px] tracking-wide [word-spacing:5px]">
                For every contact, we provide detailed descriptions, including facts like what times a venue in Eastern Pennsylvania is booking shows, and what genres they book. See the research at any point in the tool, from searching the map up to sending your first email.
              </p>
            </div>

            <div className="h-[462px] w-[745px] rounded-[22px] bg-white px-[56px] pt-[48px]">
              <p className="font-inter font-bold text-[24px] text-black">
                Know the History
              </p>
              <p className="font-inter text-[21px] text-black mt-[32px] pr-[24px] leading-[57px] tracking-wide [word-spacing:5px]">
                The research goes beyond the basics and into the culture of each location. Know if a brewery in West Virginia is serving hikers, or if a coffee shop in Illinois hosts an outdoor summer concert series. We care about the details.
              </p>
            </div>
          </FadeInUp>

          <FadeInUp
            delay={0.05}
            className="h-[945px] w-[587px] rounded-[22px] bg-[#D3F4FF] flex items-center justify-center overflow-hidden"
          >
            <PanelDemo className="w-[424px]" style={{ height: 'auto' }} />
          </FadeInUp>
        </div>
      </div>

      {/* Mobile Layout ("The Details Matter" block) */}
      <div className="lg:hidden w-full mt-12 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-[686px] flex flex-col gap-6">
          <FadeInUp className="bg-[#D7E7FF] rounded-[22px] px-6 pt-10 pb-10 sm:px-10">
            <p className="font-inter font-bold text-[20px] text-black leading-tight">
              The Details Matter
            </p>

            <div className="mt-8 flex justify-center overflow-hidden">
              <SampleEmail className="w-full h-auto max-w-[520px]" />
            </div>
          </FadeInUp>

          <FadeInUp delay={0.05} className="bg-white rounded-[22px] px-6 py-10 sm:px-10">
            <p className="font-inter font-normal text-[16px] text-black text-left leading-[1.75] tracking-wide [word-spacing:4px]">
              Get the details right the first time you reach out to a winery or a coffee shop. Research feeds into your drafts so every pitch fits the venue.
            </p>
          </FadeInUp>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="relative hidden lg:flex justify-center mt-[82px] px-4 overflow-visible research-feature-scale-wrapper research-feature-scale-wrapper--details">
        <div className="research-feature-scale-inner flex flex-col w-[1363px] h-[989px]">
          <FadeInUp className="w-full h-[110px] rounded-[22px] bg-white flex items-center px-[56px]">
            <p className="font-inter font-bold text-[24px] text-black">
              The Details Matter
            </p>
          </FadeInUp>

          <FadeInUp
            delay={0.05}
            className="mt-[9px] w-full h-[651px] rounded-[22px] bg-[#D7E7FF] flex items-center justify-center overflow-hidden"
          >
            <SampleEmail />
          </FadeInUp>

          <FadeInUp
            delay={0.1}
            className="mt-[19px] w-full h-[200px] rounded-[22px] bg-white flex items-center justify-start px-[56px]"
          >
            <p className="font-inter text-[23px] text-black leading-[45px] tracking-wide [word-spacing:5px] text-left max-w-[1200px]">
              Get the details right the first time you reach out to a winery or a coffee shop. Research feeds into your drafts so every pitch fits the venue.
            </p>
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
