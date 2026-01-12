'use client';

import React from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import DraftingDemo from '@/components/atoms/_svg/DraftingDemo';
import ProfileDemo from '@/components/atoms/_svg/ProfileDemo';

export default function DraftingPage() {
  React.useEffect(() => {
    const footer = document.querySelector('footer');
    if (footer) {
      footer.style.display = 'none';
    }
    
    return () => {
      const footer = document.querySelector('footer');
      if (footer) {
        footer.style.display = '';
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full h-[264px] flex items-center justify-center">
        <h1 
          className="font-inter text-center"
          style={{ fontSize: '65px' }}
        >
          Drafting
        </h1>
      </div>
      <div className="flex justify-center">
        <DraftingDemo className="translate-x-14" />
      </div>
      <div className="flex justify-center mt-[192px]">
        <div 
          style={{ 
            width: 1354, 
            height: 424, 
            backgroundColor: '#FAFAFA',
            position: 'relative'
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
              top: 20
            }}
          >
            <p className="font-inter font-bold text-[24px] text-black pt-6 pl-6">
              Tell your story:
            </p>
            <p className="font-inter text-[23px] text-black pl-6 pr-6 mt-[24px] leading-[56px] tracking-wide [word-spacing:5px]">
              When you add basic information to your profile, it gives context to the drafting. This creates much better results that incorporate your real bio, links, booking date range, and any custom instructions.
            </p>
          </div>
          <ProfileDemo 
            style={{
              position: 'absolute',
              right: 142,
              top: 17
            }}
          />
        </div>
      </div>
      <div className="flex justify-center mt-[146px]">
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
            style={{ position: 'absolute', top: 70, left: 58 }}
          >
            Drafting Modes:
          </p>
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
              Murmur has three distinct drafting modes: Auto, Manual, and Hybrid. Auto drafts based on the full range of information it has provided, such as the user profile, the contact research, contact location, and booking date range. In contrast to this, manual mode is a complete text editor with full customization. Then for edge cases, there's hybrid.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-[181px]">
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
              When drafting in Auto mode, we've done extensive work to ensure that no two emails are identical, often drafting in fairly different structures. This allows you to embody a more unique voice for each contact you reach out to.
            </p>
          </div>
        </div>
      </div>
      <div className="h-[660px] flex flex-col items-center justify-center">
        <p className="font-inter font-normal text-[62px] text-black text-center">
          Try Murmur Now
        </p>
        <Link
          href={urls.pricing.freeTrial.index}
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
