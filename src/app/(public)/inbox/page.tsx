'use client';

import React from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import InboxDemo from '@/components/atoms/_svg/InboxDemo';
import InboundDemo from '@/components/atoms/_svg/InboundDemo';
import ReplyInbox from '@/components/atoms/_svg/ReplyInbox';
import { ScaledToFit } from '@/components/atoms/ScaledToFit';

export default function InboxPage() {
  React.useEffect(() => {
    const footer = document.querySelector('footer');
    if (footer) {
      footer.style.display = 'none';
    }

    document.documentElement.classList.add('murmur-inbox-compact');
    
    return () => {
      const footer = document.querySelector('footer');
      if (footer) {
        footer.style.display = '';
      }

      document.documentElement.classList.remove('murmur-inbox-compact');
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full h-[264px] flex items-center justify-center">
        <h1 className="font-inter text-center text-[48px] sm:text-[56px] lg:text-[65px] leading-none">
          Inbox
        </h1>
      </div>
      <div className="flex justify-center">
        <ScaledToFit baseWidth={1017} fitWidth={1241} baseHeight={568} className="max-w-[85vw] sm:max-w-none">
          <InboxDemo className="translate-x-28" />
        </ScaledToFit>
      </div>
      {/* Never miss a reply */}
      {/* Narrow layout (stacked, keep the light #FAFAFA panel) */}
      <div className="xl:hidden w-full mt-[102px] px-[14%]">
        <div className="mx-auto w-full max-w-[904px] bg-[#FAFAFA] px-6 xs:px-8 pt-10 pb-12">
          <div className="bg-[#EFEFEF] rounded-[8px] px-6 py-8">
            <p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
              Never miss a reply
            </p>
            <p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight mt-2 break-words">
              Keep track of when venues reply to you. Each response is tagged to its corresponding campaign, so you&apos;ll always know where it came from.
            </p>
          </div>

          <div className="mt-8">
            <ScaledToFit baseWidth={834} baseHeight={466}>
              <InboundDemo />
            </ScaledToFit>
          </div>
        </div>
      </div>

      {/* Wide layout (original design) */}
      <div className="hidden xl:flex justify-center mt-[102px]">
        <div
          className="bg-[#FAFAFA] relative"
          style={{ width: '1363px', height: '599px' }}
        >
          <p
            className="font-inter font-bold text-[24px] text-black absolute"
            style={{ top: '56px', left: '65px' }}
          >
            Never miss a reply
          </p>
          <div
            className="bg-[#EFEFEF] rounded-[6px] absolute"
            style={{
              width: '441px',
              height: '383px',
              top: '108px',
              left: '25px',
              paddingLeft: '40px',
              paddingTop: '40px',
              paddingRight: '40px',
            }}
          >
            <p className="font-inter text-[23px] text-black leading-[45px] tracking-wide [word-spacing:5px]">
              Keep track of when venues reply to you. Each response is tagged to its corresponding campaign, so you&apos;ll always know where it came from.
            </p>
          </div>
          <div className="absolute" style={{ top: '79px', right: '37px' }}>
            <InboundDemo />
          </div>
        </div>
      </div>
      {/* Respond from Within Campaigns */}
      {/* Narrow layout (stacked, keep the light #FAFAFA panel) */}
      <div className="xl:hidden w-full mt-[97px] px-[14%]">
        <div className="mx-auto w-full max-w-[904px] bg-[#FAFAFA] px-6 xs:px-8 pt-10 pb-12">
          <div className="bg-[#EFEFEF] rounded-[8px] px-6 py-8">
            <p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
              Respond from Within Campaigns
            </p>
            <p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight mt-2 break-words">
              Each campaign has its own inbox tab, showing just responses from that batch. Contact research is provided next to each reply so you can reply quickly without digging through notes. Since your inbox lives inside the campaign, you can see exactly what you sent alongside their reply.
            </p>
          </div>

          {/* Demo (split the wide SVG into two stacked panels) */}
          <div className="mt-10 space-y-10">
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
              </div>
            </ScaledToFit>

            {/* Right (green) panel */}
            <ScaledToFit baseWidth={650} baseHeight={498}>
              <div className="relative w-full h-full">
                <ReplyInbox
                  width={650}
                  height={498}
                  viewBox="684 0 650 498"
                  preserveAspectRatio="xMinYMin meet"
                />
                <div
                  className="absolute text-black font-inter text-[11px] leading-[15px]"
                  style={{
                    top: '188px',
                    left: '56px',
                    width: '540px',
                    height: '160px',
                    paddingLeft: '20px',
                    paddingTop: '8px',
                    paddingRight: '20px',
                  }}
                >
                  <p>Hi Alex,</p>
                  <p>
                    Thanks so much for getting back to me! totally understand the timing. I&apos;d love to stay in the loop for when your fall calendar opens back up.
                  </p>
                  <p className="mt-2">
                    Please feel free to keep these on file, and don&apos;t hesitate to reach out if anything pops up sooner. Looking forward to reconnecting in the fall.
                  </p>
                  <p className="mt-1">Best,</p>
                  <p>John</p>
                </div>
              </div>
            </ScaledToFit>
          </div>
        </div>
      </div>

      {/* Wide layout (original design) */}
      <div className="hidden xl:flex justify-center mt-[97px]">
        <div
          className="bg-[#FAFAFA] relative"
          style={{ width: '1363px', height: '965px' }}
        >
          <p
            className="font-inter font-bold text-[24px] text-black absolute left-1/2 -translate-x-1/2"
            style={{ top: '45px' }}
          >
            Respond from Within Campaigns
          </p>
          <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '312px' }}>
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
          </div>
          <div
            className="bg-[#EFEFEF] rounded-[6px] absolute left-1/2 -translate-x-1/2 flex items-center"
            style={{ width: '1324px', height: '228px', bottom: '43px', paddingLeft: '56px', paddingRight: '56px' }}
          >
            <p className="font-inter text-[23px] text-black leading-[55px] tracking-wide [word-spacing:5px]">
              Each campaign has its own inbox tab, showing just responses from that batch. Contact research is provided next to each reply so you can reply quickly without digging through notes. Since your inbox lives inside the campaign, you can see exactly what you sent alongside their reply.
            </p>
          </div>
        </div>
      </div>
      <div className="h-[660px] flex flex-col items-center justify-center">
        <p className="font-inter font-normal text-[clamp(32px,9vw,62px)] text-black text-center leading-[1.05]">
          Try Murmur Now
        </p>
        <Link
          href={urls.freeTrial.index}
          className="flex items-center justify-center cursor-pointer text-center text-white font-inter font-medium text-[14px]"
          style={{
            marginTop: '32px',
            width: '219px',
            height: '33px',
            backgroundColor: '#53B060',
            border: '1px solid #118521',
            borderRadius: '8px',
          }}
        >
          Start Free Trial
        </Link>
      </div>
    </div>
  );
}
