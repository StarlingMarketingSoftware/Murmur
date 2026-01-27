'use client';

import React from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import InboxDemo from '@/components/atoms/_svg/InboxDemo';
import InboundDemo from '@/components/atoms/_svg/InboundDemo';
import ReplyInbox from '@/components/atoms/_svg/ReplyInbox';
import { ScaledToFit } from '@/components/atoms/ScaledToFit';
import { FadeInUp } from '@/components/animations/FadeInUp';

export default function InboxPage() {
  React.useEffect(() => {
    const footer = document.querySelector('footer');
    if (footer) {
      footer.style.display = 'none';
    }

    // Defensive: if any prior view left inline scroll locks behind (overflow hidden, fixed body, etc),
    // clear them so the marketing pages always remain scrollable on mobile Safari.
    try {
      document.body.style.overflow = '';
      document.body.style.overflowX = '';
      document.body.style.overflowY = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
    } catch {
      // ignore
    }

    // Only apply compact (zoom/scale) treatment on desktop *non-touch* devices.
    // On mobile Safari, root-level scaling can break touch scrolling (and can fully lock scrolling).
    const compactMql = window.matchMedia('(min-width: 1024px)');
    const touchMql = window.matchMedia('(hover: none) and (pointer: coarse)');
    const syncCompactClass = () => {
      if (compactMql.matches && !touchMql.matches) {
        document.documentElement.classList.add('murmur-inbox-compact');
      } else {
        document.documentElement.classList.remove('murmur-inbox-compact');
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
    
    return () => {
      const footer = document.querySelector('footer');
      if (footer) {
        footer.style.display = '';
      }

      document.documentElement.classList.remove('murmur-inbox-compact');
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
    };
  }, []);

  return (
    <main className="relative bg-[#F5F5F7] overflow-x-hidden landing-page">
      {/* Gradient overlay for first 1935px */}
      <div
        className="fixed top-0 left-0 w-full pointer-events-none z-0"
        style={{
          height: '1935px',
          background: 'linear-gradient(to bottom, #D3E9FF, #F5F5F7)',
        }}
      />
      <div className="relative z-10 min-h-screen">
        <div className="relative flex justify-center pt-8 pb-6 lg:pt-[53px] lg:pb-0">
          <FadeInUp className="w-[calc(100vw-32px)] max-w-[1160px] bg-[#F2FBFF] rounded-[22px] flex flex-col items-center gap-6 px-4 pt-6 pb-6 lg:w-[1160px] lg:h-[823px] lg:px-[46px] lg:pt-[30px] lg:pb-[30px]">
            <h1 className="font-inter font-extralight tracking-[0.19em] text-[#696969] text-center text-[40px] sm:text-[56px] lg:text-[65px] leading-none">
              Inbox
            </h1>
            <div className="w-full flex-1 min-h-0 flex justify-center">
              <InboxDemo className="w-full h-auto lg:h-full" />
            </div>
          </FadeInUp>
        </div>
      {/* Never miss a reply */}
      {/* Narrow layout (stacked, keep the light #FAFAFA panel) */}
      <div className="xl:hidden w-full mt-16 md:mt-[102px] px-4 sm:px-[8%] md:px-[14%]">
        <div className="mx-auto w-full max-w-[904px]">
          <FadeInUp className="bg-white rounded-[22px] px-6 xs:px-8 sm:px-10 pt-10 pb-12">
            <p className="font-inter font-bold text-[20px] text-black text-left leading-tight">
              Never miss a reply
            </p>
            <p className="font-inter font-normal text-[16px] text-black text-left mt-5 leading-[1.75] tracking-wide [word-spacing:3px] break-words">
              Keep track of when venues reply to you. Each response is tagged to its corresponding campaign, so you&apos;ll always know where it came from.
            </p>
          </FadeInUp>

          <FadeInUp
            delay={0.05}
            className="mt-6 rounded-[22px] bg-gradient-to-b from-[#DFF2F4] to-[#B9EDFD] overflow-hidden flex items-center justify-center px-4 py-6"
          >
            <ScaledToFit baseWidth={834} baseHeight={466}>
              <InboundDemo />
            </ScaledToFit>
          </FadeInUp>
        </div>
      </div>

      {/* Wide layout (original design) */}
      <div className="relative hidden xl:flex justify-center mt-[102px] px-4 overflow-visible inbox-feature-scale-wrapper inbox-feature-scale-wrapper--never-miss">
        <div className="inbox-feature-scale-inner flex w-[1363px] h-[599px] gap-[11px]">
          <FadeInUp className="shrink-0 w-[439px] h-[599px] bg-white rounded-[22px] px-[56px] pt-[78px]">
            <p className="font-inter font-bold text-[24px] text-black text-left">
              Never miss a reply
            </p>
            <p className="font-inter text-[21px] text-black text-left mt-[32px] pr-[24px] leading-[57px] tracking-wide [word-spacing:5px]">
              Keep track of when venues reply to you. Each response is tagged to its corresponding campaign, so you&apos;ll always know where it came from.
            </p>
          </FadeInUp>
          <FadeInUp
            delay={0.05}
            className="shrink-0 w-[913px] h-[599px] rounded-[22px] bg-gradient-to-b from-[#DFF2F4] to-[#B9EDFD] overflow-hidden flex items-center justify-center"
          >
            <ScaledToFit baseWidth={834} baseHeight={466}>
              <InboundDemo />
            </ScaledToFit>
          </FadeInUp>
        </div>
      </div>
      {/* Respond from Within Campaigns */}
      {/* Narrow layout (stacked) */}
      <div className="xl:hidden w-full mt-16 md:mt-[97px] px-4 sm:px-[8%] md:px-[14%]">
        <div className="mx-auto w-full max-w-[904px]">
          <FadeInUp className="bg-white rounded-[22px] px-6 xs:px-8 sm:px-10 pt-10 pb-12">
            <p className="font-inter font-bold text-[20px] text-black text-left leading-tight">
              Respond from Within Campaigns
            </p>
            <p className="font-inter font-normal text-[16px] text-black text-left mt-5 leading-[1.75] tracking-wide [word-spacing:3px] break-words">
              Each campaign has its own inbox tab, showing just responses from that batch. Contact research is
              provided next to each reply so you can reply quickly without digging through notes. Since your inbox
              lives inside the campaign, you can see exactly what you sent alongside their reply.
            </p>
          </FadeInUp>

          <FadeInUp
            delay={0.05}
            className="mt-6 rounded-[22px] bg-gradient-to-b from-[#C3E8C9] to-[#AFF1B8] overflow-hidden px-4 py-6"
          >
            <div className="space-y-6">
              {/* Left (blue) panel */}
              <ScaledToFit baseWidth={650} baseHeight={498}>
                <div className="relative w-full h-full">
                  <ReplyInbox
                    width={650}
                    height={498}
                    viewBox="0 0 650 498"
                    preserveAspectRatio="xMinYMin meet"
                  />
                  <div
                    className="absolute text-black font-inter text-[11px] leading-[18px]"
                    style={{ top: '118px', left: '24px', width: '560px', height: '200px', padding: '12px' }}
                  >
                    <p>
                      Thank you so much for reaching out and for your interest in performing here. At the moment,
                      we&apos;re not booking any new shows until further notice, as we&apos;re in the middle of planning
                      our next season. That said, we&apos;d be happy to revisit the conversation in the fall once our
                      calendar opens back up.
                    </p>
                    <p className="mt-3">
                      If you&apos;d like, please send over any links to your music, live performance videos, or press
                      materials so we can keep them on file. This way, when we start booking again, we&apos;ll already
                      have a sense of your work and can get in touch quickly if there&apos;s a good fit.
                    </p>
                    <p className="mt-1">
                      We really appreciate you thinking of us as a potential venue and look forward to staying in
                      touch.
                    </p>
                    <p className="mt-1">Best,</p>
                    <p>Alex</p>
                  </div>
                </div>
              </ScaledToFit>

              {/* Right (green) panel */}
              <ScaledToFit baseWidth={650} baseHeight={498}>
                <div className="relative w-full h-full">
                  <ReplyInbox
                    width={650}
                    height={498}
                    viewBox="690.36 0 650 498"
                    preserveAspectRatio="xMinYMin meet"
                  />
                  <div
                    className="absolute text-black font-inter text-[11px] leading-[15px]"
                    style={{
                      top: '188px',
                      left: '49.64px',
                      width: '540px',
                      height: '160px',
                      paddingLeft: '20px',
                      paddingTop: '8px',
                      paddingRight: '20px',
                    }}
                  >
                    <p>Hi Alex,</p>
                    <p>
                      Thanks so much for getting back to me! totally understand the timing. I&apos;d love to stay in
                      the loop for when your fall calendar opens back up.
                    </p>
                    <p className="mt-2">
                      Please feel free to keep these on file, and don&apos;t hesitate to reach out if anything pops up
                      sooner. Looking forward to reconnecting in the fall.
                    </p>
                    <p className="mt-1">Best,</p>
                    <p>John</p>
                  </div>
                </div>
              </ScaledToFit>
            </div>
          </FadeInUp>
        </div>
      </div>

      {/* Wide layout (original design) */}
      <div className="relative hidden xl:flex justify-center mt-[97px] px-4 overflow-visible inbox-feature-scale-wrapper inbox-feature-scale-wrapper--respond">
        <div className="inbox-feature-scale-inner w-[1383px] h-[939px] flex flex-col items-center">
          {/* Subject */}
          <FadeInUp className="w-[1383px] h-[102px] bg-white rounded-[22px] flex items-center justify-center">
            <p className="font-inter font-bold text-[24px] text-black">Respond from Within Campaigns</p>
          </FadeInUp>

          {/* 13px below subject */}
          <FadeInUp
            delay={0.05}
            className="mt-[13px] w-[1363px] h-[542px] rounded-[22px] bg-gradient-to-b from-[#C3E8C9] to-[#AFF1B8] overflow-hidden flex items-center justify-center"
          >
            <div className="relative">
              <ReplyInbox />
              {/* Text overlay for left blue box */}
              <div
                className="absolute text-black font-inter text-[11px] leading-[18px]"
                style={{ top: '118px', left: '24px', width: '560px', height: '200px', padding: '12px' }}
              >
                <p>
                  Thank you so much for reaching out and for your interest in performing here. At the moment, we&apos;re not booking any new shows until further notice, as we&apos;re in the middle of planning our next season. That said, we&apos;d be happy to revisit the conversation in the fall once our calendar opens back up.
                </p>
                <p className="mt-3">
                  If you&apos;d like, please send over any links to your music, live performance videos, or press materials so we can keep them on file. This way, when we start booking again, we&apos;ll already have a sense of your work and can get in touch quickly if there&apos;s a good fit.
                </p>
                <p className="mt-1">
                  We really appreciate you thinking of us as a potential venue and look forward to staying in touch.
                </p>
                <p className="mt-1">Best,</p>
                <p>Alex</p>
              </div>
              {/* Text overlay for right green panel white box */}
              <div
                className="absolute text-black font-inter text-[11px] leading-[15px]"
                style={{
                  top: '188px',
                  left: '740px',
                  width: '540px',
                  height: '160px',
                  paddingLeft: '20px',
                  paddingTop: '8px',
                  paddingRight: '20px',
                }}
              >
                <p>Hi Alex,</p>
                <p>
                  Thanks so much for getting back to me! totally understand the timing. I&apos;d love to stay in the loop for when your fall calendar opens up.
                </p>
                <p className="mt-2">
                  Please feel free to keep these on file, and don&apos;t hesitate to reach out if anything pops up sooner. Looking forward to reconnecting in the fall.
                </p>
                <p className="mt-1">Best,</p>
                <p>John</p>
              </div>
            </div>
          </FadeInUp>

          {/* 15px below SVG area */}
          <FadeInUp
            delay={0.1}
            className="mt-[15px] w-[1363px] h-[267px] bg-white rounded-[22px] flex items-start px-[56px] pt-[32px]"
          >
            <p className="font-inter text-[21px] text-black text-left pr-[24px] leading-[57px] tracking-wide [word-spacing:5px]">
              Each campaign has its own inbox tab, showing just responses from that batch. Contact research is provided next to each reply so you can reply quickly without digging through notes. Since your inbox lives inside the campaign, you can see exactly what you sent alongside their reply.
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
