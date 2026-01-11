'use client';

import React from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import ResearchDemo from '@/components/atoms/_svg/ResearchDemo';

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
          <div style={{
            width: '686px',
            height: '383px',
            backgroundColor: '#EFEFEF',
            borderRadius: '6px',
            position: 'absolute',
            top: '19px',
            left: '24px'
          }}>
          </div>
          <div style={{
            width: '686px',
            height: '383px',
            backgroundColor: '#EFEFEF',
            borderRadius: '6px',
            position: 'absolute',
            bottom: '60px',
            left: '24px'
          }}>
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
            left: '24px'
          }}>
          </div>
          <div style={{
            width: '1218px',
            height: '155px',
            backgroundColor: '#EFEFEF',
            borderRadius: '6px',
            position: 'absolute',
            bottom: '35px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}>
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
