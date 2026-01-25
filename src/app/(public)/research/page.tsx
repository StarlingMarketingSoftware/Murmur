'use client';

import React from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import ResearchDemo from '@/components/atoms/_svg/ResearchDemo';
import PanelDemo from '@/components/atoms/_svg/PanelDemo';
import SampleEmail from '@/components/atoms/_svg/sampleEmail';

export default function ResearchPage() {
  React.useEffect(() => {
    const footer = document.querySelector('footer');
    if (footer) {
      footer.style.display = 'none';
    }

    document.documentElement.classList.add('murmur-research-compact');
    
    return () => {
      const footer = document.querySelector('footer');
      if (footer) {
        footer.style.display = '';
      }

      document.documentElement.classList.remove('murmur-research-compact');
    };
  }, []);

  return (
    <main className="relative bg-[#F5F5F7]">
      {/* Gradient overlay for first 1935px (offset by navbar spacer height, h-12 = 48px) */}
      <div
        className="absolute -top-12 left-0 w-full pointer-events-none z-0"
        style={{
          height: '1935px',
          background: 'linear-gradient(to bottom, #D3F4FF, #F5F5F7)',
        }}
      />

      <div className="relative z-10 min-h-screen">
        <div className="relative flex justify-center pt-8 pb-6 lg:pt-[53px] lg:pb-0">
          <div className="w-[calc(100vw-32px)] max-w-[966px] bg-[#F2FBFF] rounded-[22px] flex flex-col items-center gap-6 px-4 pt-6 pb-6 lg:w-[966px] lg:h-[823px] lg:px-[46px] lg:pt-[30px] lg:pb-[30px]">
            <h1 className="font-inter font-extralight tracking-[0.19em] text-[#696969] text-center text-[40px] sm:text-[56px] lg:text-[65px] leading-none">
              Research
            </h1>
            <div className="w-full flex-1 min-h-0 flex justify-center">
              <ResearchDemo className="w-full h-auto lg:h-full" />
            </div>
          </div>
        </div>
      
      {/* Mobile Layout (match landing page ultra-narrow typography/padding) */}
      <div className="lg:hidden w-full mt-14 px-[14%]">
        <div className="mx-auto w-full max-w-[686px] bg-[#FAFAFA]">
          <div className="bg-[#EFEFEF] rounded-[8px] px-6 py-8">
            <p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
              From Booking Schedules to Genre
            </p>
            <p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight mt-2 break-words">
              For every contact, we provide detailed descriptions, including facts like what times a venue in Eastern Pennsylvania is booking shows, and what genres they book. See the research at any point in the tool, from searching the map up to sending your first email.
            </p>
          </div>

          <div className="mt-6 bg-[#F1F1F1] rounded-[8px] px-6 pt-8 pb-10 overflow-hidden flex justify-center">
            <PanelDemo className="w-full h-auto max-w-[424px]" />
          </div>

          <div className="mt-6 bg-[#EFEFEF] rounded-[8px] px-6 py-8">
            <p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
              Know the History
            </p>
            <p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight mt-2 break-words">
              The research goes beyond the basics and into the culture of each location. Know if a brewery in West Virginia is serving hikers, or if a coffee shop in Illinois hosts an outdoor summer concert series. We care about the details.
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="relative hidden lg:flex justify-center mt-[180px] px-4 overflow-visible research-feature-scale-wrapper research-feature-scale-wrapper--top">
        <div className="research-feature-scale-inner flex w-[1352px] h-[945px] gap-[20px]">
          <div className="flex h-full w-[745px] flex-col gap-[21px]">
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
          </div>

          <div className="h-[945px] w-[587px] rounded-[22px] bg-[#D3F4FF] flex items-center justify-center overflow-hidden">
            <PanelDemo className="w-[424px]" style={{ height: 'auto' }} />
          </div>
        </div>
      </div>

      {/* Mobile Layout (match landing page ultra-narrow typography/padding) */}
      <div className="lg:hidden w-full mt-12 px-[14%]">
        <div className="mx-auto w-full max-w-[686px] bg-[#FAFAFA]">
          <div className="bg-[#EFEFEF] rounded-[8px] px-6 py-8">
            <p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
              The Details Matter
            </p>
          </div>

          <div className="mt-6 bg-[#F1F1F1] rounded-[8px] px-6 pt-8 pb-10 overflow-hidden flex justify-center">
            <SampleEmail className="w-full h-auto max-w-[376px]" />
          </div>

          <div className="mt-6 bg-[#EFEFEF] rounded-[8px] px-6 py-8">
            <p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight break-words">
              Get the details right the first time you reach out to a winery or a coffee shop. Research feeds into your drafts so every pitch fits the venue.
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="relative hidden lg:flex justify-center mt-[82px] px-4 overflow-visible research-feature-scale-wrapper research-feature-scale-wrapper--details">
        <div className="research-feature-scale-inner flex flex-col w-[1363px] h-[989px]">
          <div className="w-full h-[110px] rounded-[22px] bg-white flex items-center px-[56px]">
            <p className="font-inter font-bold text-[24px] text-black">
              The Details Matter
            </p>
          </div>

          <div className="mt-[9px] w-full h-[651px] rounded-[22px] bg-[#D7E7FF] flex items-center justify-center overflow-hidden">
            <SampleEmail />
          </div>

          <div className="mt-[19px] w-full h-[200px] rounded-[22px] bg-white flex items-center justify-start px-[56px]">
            <p className="font-inter text-[23px] text-black leading-[45px] tracking-wide [word-spacing:5px] text-left max-w-[1200px]">
              Get the details right the first time you reach out to a winery or a coffee shop. Research feeds into your drafts so every pitch fits the venue.
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center pt-14 pb-16 sm:pt-16 sm:pb-20 lg:py-0 lg:h-[660px]">
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
    </main>
  );
}
