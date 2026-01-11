'use client';

import React from 'react';
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
    </div>
  );
}
