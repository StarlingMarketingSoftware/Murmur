'use client';

import React from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import InboxDemo from '@/components/atoms/_svg/InboxDemo';

export default function InboxPage() {
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
          Inbox
        </h1>
      </div>
      <div className="flex justify-center">
        <InboxDemo className="translate-x-28" />
      </div>
      <div className="flex justify-center mt-[102px]">
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
            style={{ width: '441px', height: '383px', top: '108px', left: '25px', paddingLeft: '40px', paddingTop: '40px', paddingRight: '40px' }}
          >
            <p className="font-inter text-[23px] text-black leading-[45px] tracking-wide [word-spacing:5px]">
              Keep track of when venues reply to you. Each response is tagged to its corresponding campaign, so you'll always know where it came from.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-[97px]">
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
