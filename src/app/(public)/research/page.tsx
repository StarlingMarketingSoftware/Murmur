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
          Research
        </h1>
      </div>
      <div className="flex justify-center">
        <ResearchDemo />
      </div>
      <div className="flex justify-center mt-[180px]">
        <div style={{ width: '1363px', height: '1053px', backgroundColor: '#FAFAFA', position: 'relative' }}>
          <div style={{ position: 'absolute', right: '130px', top: '128px' }}>
            <PanelDemo />
          </div>
          <div style={{
            width: '686px',
            height: '383px',
            backgroundColor: '#EFEFEF',
            borderRadius: '6px',
            position: 'absolute',
            top: '19px',
            left: '24px',
            paddingLeft: '56px',
            paddingTop: '32px'
          }}>
            <p className="font-inter font-bold text-[24px] text-black">
              From Booking Schedules to Genre
            </p>
            <p className="font-inter text-[23px] text-black mt-[24px] pr-[56px] leading-[45px] tracking-wide [word-spacing:5px]">
              For every contact, we provide detailed descriptions, including facts like what times a venue in Eastern Pennsylvania is booking shows, and what genres they book. See the research at any point in the tool, from searching the map up to sending your first email.
            </p>
          </div>
          <div style={{
            width: '686px',
            height: '383px',
            backgroundColor: '#EFEFEF',
            borderRadius: '6px',
            position: 'absolute',
            bottom: '60px',
            left: '24px',
            paddingLeft: '56px',
            paddingTop: '32px'
          }}>
            <p className="font-inter font-bold text-[24px] text-black">
              Know the History
            </p>
            <p className="font-inter text-[23px] text-black mt-[24px] pr-[56px] leading-[45px] tracking-wide [word-spacing:5px]">
              The research goes beyond the basics and into the culture of each location. Know if a brewery in West Virginia is serving hikers, or if a coffee shop in Illinois hosts an outdoor summer concert series. We care about the details.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-[82px]">
        <div style={{ width: '1363px', height: '1026px', backgroundColor: '#FAFAFA', position: 'relative' }}>
          <div style={{
            width: '356px',
            height: '77px',
            backgroundColor: '#EFEFEF',
            borderRadius: '6px',
            position: 'absolute',
            top: '45px',
            left: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <p className="font-inter font-bold text-[24px] text-black">
              The Details Matter
            </p>
          </div>
          <div
            style={{
              position: 'absolute',
              top: '171px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <SampleEmail />
          </div>
          <div style={{
            width: '1218px',
            height: '155px',
            backgroundColor: '#EFEFEF',
            borderRadius: '6px',
            position: 'absolute',
            bottom: '35px',
            left: '50%',
            transform: 'translateX(-50%)',
            paddingLeft: '56px',
            paddingTop: '32px',
            paddingRight: '56px'
          }}>
            <p className="font-inter text-[23px] text-black leading-[45px] tracking-wide [word-spacing:5px]">
              Get the details right the first time you reach out to a winery or a coffee shop. Research feeds into your drafts so every pitch fits the venue.
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
