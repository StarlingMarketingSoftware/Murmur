'use client';

import MuxPlayer from '@mux/mux-player-react';
import Link from 'next/link';
import { urls } from '@/constants/urls';

const videoStyle = {
  '--controls': 'none',
  '--play-button': 'none',
  '--center-play-button': 'none',
  '--mute-button': 'none',
  '--pip-button': 'none',
  '--airplay-button': 'none',
  '--cast-button': 'none',
  '--fullscreen-button': 'none',
  '--loading-indicator': 'none',
  '--dialog': 'none',
  '--title-display': 'none',
  '--duration-display': 'none',
  '--time-display': 'none',
  '--playback-rate-button': 'none',
  '--volume-range': 'none',
  '--time-range': 'none',
  '--captions-button': 'none',
  '--live-button': 'none',
  '--seek-backward-button': 'none',
  '--seek-forward-button': 'none',
  '--rendition-selectmenu': 'none',
  '--audio-track-selectmenu': 'none',
  '--media-background-color': 'transparent',
  backgroundColor: 'transparent',
  border: 'none',
  outline: 'none',
  boxShadow: 'none',
} as React.CSSProperties;

export default function MapPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="w-full h-[264px] flex items-center justify-center">
        <h1 
          className="font-inter text-center"
          style={{ fontSize: '65px' }}
        >
          Mapping
        </h1>
      </div>
      <div className="flex justify-center overflow-hidden">
        <MuxPlayer
          style={{ ...videoStyle, height: '772px', aspectRatio: '16/9' }}
          playbackId="C02P1SQEGXOZ00sb2s9qZrhVGqhLqgBDNy014vrcueeGH4"
          streamType="on-demand"
          autoPlay="muted"
          muted
          loop
          playsInline
          nohotkeys
        />
      </div>
      <div className="flex justify-center mt-[196px]">
        <div style={{ width: '1347px', height: '364px', backgroundColor: '#FAFAFA', position: 'relative' }}>
          <div style={{ 
            width: '678px', 
            height: '327px', 
            backgroundColor: '#EFEFEF', 
            borderRadius: '6px',
            position: 'absolute',
            left: '24px',
            top: '17px'
          }} />
        </div>
      </div>
      <div className="flex justify-center mt-[81px]">
        <div style={{ width: '1347px', height: '364px', backgroundColor: '#FAFAFA', position: 'relative' }}>
          <div style={{ 
            width: '678px', 
            height: '327px', 
            backgroundColor: '#EFEFEF', 
            borderRadius: '6px',
            position: 'absolute',
            right: '23px',
            top: '17px'
          }} />
        </div>
      </div>
      <div className="flex justify-center mt-[119px]">
        <div style={{ width: '1347px', height: '364px', backgroundColor: '#FAFAFA', position: 'relative' }}>
          <div style={{ 
            width: '678px', 
            height: '327px', 
            backgroundColor: '#EFEFEF', 
            borderRadius: '6px',
            position: 'absolute',
            left: '24px',
            top: '17px'
          }} />
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
