'use client';

import React from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import DraftingDemo from '@/components/atoms/_svg/DraftingDemo';
import ProfileDemo from '@/components/atoms/_svg/ProfileDemo';
import ModesDemo from '@/components/atoms/_svg/ModesDemo';
import DraftPreviewDemo from '@/components/atoms/_svg/DraftPreviewDemo';
import { ScaledToFit } from '@/components/atoms/ScaledToFit';

export default function DraftingPage() {
  React.useEffect(() => {
    const footer = document.querySelector('footer') as HTMLElement | null;
    const prevFooterDisplay = footer?.style.display ?? '';
    const prevBodyZoom = document.body.style.getPropertyValue('zoom');

    if (footer) {
      footer.style.display = 'none';
    }

    // Make this route render at ~80% browser zoom.
    document.body.style.setProperty('zoom', '0.8');

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
    <div className="min-h-screen bg-white">
      <div className="w-full h-[264px] flex items-center justify-center">
        <h1 className="font-inter text-center text-[40px] sm:text-[56px] lg:text-[65px] leading-none">
          Drafting
        </h1>
      </div>
      <div className="flex justify-center w-full px-4">
        <div className="w-full max-w-[1082px]">
          {/* Avoid overflow-x clipping from translate-x-14 on narrower viewports */}
          <DraftingDemo className="w-full h-auto translate-x-12 max-[1193px]:w-[calc(100%-3rem)]" />
        </div>
      </div>
      {/* Tell your story */}
      {/* Narrow layout (stacked, keep the light #FAFAFA panel) */}
      <div className="hidden max-[1193px]:block w-full mt-[192px] px-[14%]">
        <div className="mx-auto w-full max-w-[904px] bg-[#FAFAFA] px-6 xs:px-8 pt-10 pb-12">
          <div className="bg-[#EFEFEF] rounded-[8px] px-6 py-8">
            <p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
              Tell your story
            </p>
            <p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight mt-2 break-words">
              When you add basic information to your profile, it gives context to the drafting. This creates much better results that incorporate
              your real bio, links, booking date range, and any custom instructions.
            </p>
          </div>

          <div className="mt-8">
            <ScaledToFit baseWidth={394} baseHeight={366}>
              <ProfileDemo />
            </ScaledToFit>
          </div>
        </div>
      </div>

      {/* Wide layout (original design) */}
      <div className="flex max-[1193px]:hidden justify-center mt-[192px]">
        <div
          style={{
            width: 1354,
            height: 424,
            backgroundColor: '#FAFAFA',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 682,
              height: 381,
              backgroundColor: '#EFEFEF',
              borderRadius: 6,
              position: 'absolute',
              left: 24,
              top: 20,
            }}
          >
            <p className="font-inter font-bold text-[24px] text-black pt-6 pl-6">Tell your story</p>
            <p className="font-inter text-[23px] text-black pl-6 pr-6 mt-[24px] leading-[56px] tracking-wide [word-spacing:5px]">
              When you add basic information to your profile, it gives context to the drafting. This creates much better results
              that incorporate your real bio, links, booking date range, and any custom instructions.
            </p>
          </div>
          <ProfileDemo
            style={{
              position: 'absolute',
              right: 142,
              top: 17,
            }}
          />
        </div>
      </div>
      {/* Drafting Modes */}
      {/* Narrow layout (stacked mode panels) */}
      <div className="hidden max-[1193px]:block w-full mt-[146px] px-[14%]">
        <div className="mx-auto w-full max-w-[904px] bg-[#FAFAFA] px-6 xs:px-8 pt-10 pb-12">
          <div className="bg-[#EFEFEF] rounded-[8px] px-6 py-8">
            <p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
              Drafting Modes:
            </p>
            <p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight mt-2 break-words">
              Murmur has three distinct drafting modes: Auto, Manual, and Hybrid. Auto drafts based on the full range of information it has
              provided, such as the user profile, the contact research, contact location, and booking date range. In contrast to this, manual mode
              is a complete text editor with full customization. Then for edge cases, there&apos;s hybrid.
            </p>
          </div>

          <div className="mt-12">
            <p className="font-inter font-semibold text-[16px] xs:text-[18px] text-black">Auto</p>
            <div className="mt-4">
              <ScaledToFit baseWidth={329} baseHeight={466}>
                <ModesDemo width={329} height={466} viewBox="0 0 329 466" preserveAspectRatio="xMinYMin meet" />
              </ScaledToFit>
            </div>
          </div>

          <div className="mt-12">
            <p className="font-inter font-semibold text-[16px] xs:text-[18px] text-black">Manual Mode</p>
            <div className="mt-4">
              <ScaledToFit baseWidth={329} baseHeight={466}>
                <ModesDemo width={329} height={466} viewBox="423 0 329 466" preserveAspectRatio="xMinYMin meet" />
              </ScaledToFit>
            </div>
          </div>

          <div className="mt-12">
            <p className="font-inter font-semibold text-[16px] xs:text-[18px] text-black">Hybrid Mode</p>
            <div className="mt-4">
              <ScaledToFit baseWidth={329} baseHeight={466}>
                <ModesDemo width={329} height={466} viewBox="846 0 329 466" preserveAspectRatio="xMinYMin meet" />
              </ScaledToFit>
            </div>
          </div>
        </div>
      </div>

      {/* Wide layout (original design) */}
      <div className="flex max-[1193px]:hidden justify-center mt-[146px]">
        <div 
          style={{ 
            width: 1354, 
            height: 996, 
            backgroundColor: '#FAFAFA',
            position: 'relative'
          }} 
        >
          <p 
            className="font-inter font-bold text-[24px] text-black"
            style={{ position: 'absolute', top: 50, left: 58 }}
          >
            Drafting Modes:
          </p>
          <ModesDemo 
            style={{
              position: 'absolute',
              top: 142,
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          />
          <div
            style={{
              width: 1326,
              height: 265,
              backgroundColor: '#EFEFEF',
              borderRadius: 6,
              position: 'absolute',
              bottom: 33,
              left: '50%',
              transform: 'translateX(-50%)',
              paddingLeft: 56,
              paddingRight: 56,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <p className="font-inter text-[23px] text-black leading-[56px] tracking-wide [word-spacing:5px]">
              Murmur has three distinct drafting modes: Auto, Manual, and Hybrid. Auto drafts based on the full range of information it has
              provided, such as the user profile, the contact research, contact location, and booking date range. In contrast to this, manual mode
              is a complete text editor with full customization. Then for edge cases, there&apos;s hybrid.
            </p>
          </div>
        </div>
      </div>
      {/* Built-in variation */}
      {/* Narrow layout (stacked, show both preview variants) */}
      <div className="hidden max-[1193px]:block w-full mt-[181px] px-[14%]">
        <div className="mx-auto w-full max-w-[904px] bg-[#FAFAFA] px-6 xs:px-8 pt-10 pb-12">
          <div className="bg-[#EFEFEF] rounded-[8px] px-6 py-8">
            <p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
              Built-in variation
            </p>
            <p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight mt-2 break-words">
              When drafting in Auto mode, we&apos;ve done extensive work to ensure that no two emails are identical, often drafting in fairly
              different structures. This allows you to embody a more unique voice for each contact you reach out to.
            </p>
          </div>

          <div className="mt-10 space-y-10">
            <ScaledToFit baseWidth={393} baseHeight={555}>
              <DraftPreviewDemo width={393} height={555} viewBox="0 0 393 555" preserveAspectRatio="xMinYMin meet" />
            </ScaledToFit>

            <ScaledToFit baseWidth={393} baseHeight={555}>
              <DraftPreviewDemo width={393} height={555} viewBox="410 0 393 555" preserveAspectRatio="xMinYMin meet" />
            </ScaledToFit>
          </div>
        </div>
      </div>

      {/* Wide layout (original design) */}
      <div className="flex max-[1193px]:hidden justify-center mt-[181px]">
        <div 
          style={{ 
            width: 1355, 
            height: 627, 
            backgroundColor: '#FAFAFA',
            position: 'relative'
          }} 
        >
          <p 
            className="font-inter font-bold text-[24px] text-black"
            style={{ position: 'absolute', top: 40, left: 58 }}
          >
            Built-in Variation:
          </p>
          <DraftPreviewDemo 
            style={{
              position: 'absolute',
              top: 36,
              right: 15
            }}
          />
          <div
            style={{
              width: 476,
              height: 491,
              backgroundColor: '#EFEFEF',
              borderRadius: 6,
              position: 'absolute',
              left: 37,
              top: 99,
              paddingLeft: 36,
              paddingRight: 36,
              paddingTop: 28
            }}
          >
            <p className="font-inter text-[23px] text-black leading-[56px] tracking-wide [word-spacing:5px]">
              When drafting in Auto mode, we&apos;ve done extensive work to ensure that no two emails are identical, often drafting in fairly
              different structures. This allows you to embody a more unique voice for each contact you reach out to.
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
