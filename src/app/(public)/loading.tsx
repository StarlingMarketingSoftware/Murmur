'use client';

/**
 * Mobile-specific skeleton loader for the main landing page.
 * Shows animated placeholder cards that match the mobile layout while the page loads.
 */
export default function LandingLoading() {
  return (
    <main className="overflow-x-hidden landing-page">
      <div className="landing-zoom-80">
        {/* Hero section skeleton - mobile full-bleed style */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            background: '#000',
            height: '100dvh',
          }}
        >
          <div
            className="absolute inset-0 z-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.18) 35%, rgba(0,0,0,0.58) 100%)',
            }}
          />
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-4 animate-pulse">
            {/* Headline skeleton */}
            <div className="w-full max-w-[640px] flex flex-col items-center gap-4">
              <div className="h-[clamp(24px,8vw,54px)] w-[85%] bg-white/20 rounded-[8px]" />
              <div className="h-[clamp(24px,8vw,54px)] w-[75%] bg-white/20 rounded-[8px]" />
            </div>
            {/* CTA button skeleton */}
            <div
              className="mt-6 bg-white/15 rounded-[10px]"
              style={{ width: 'min(460px, 100%)', height: '48px' }}
            />
          </div>
        </div>

        {/* Video carousel section skeleton */}
        <div className="relative">
          <div
            className="w-full bg-[#EBEBEB] py-3 overflow-hidden animate-pulse"
            style={{
              height: 'calc((min(400px, calc(100vw - 32px)) * 532 / 946) + 24px)',
            }}
          >
            <div className="flex items-center justify-center h-full">
              <div
                className="bg-[#D5D5D5] rounded-[4px]"
                style={{
                  width: 'min(400px, calc(100vw - 32px))',
                  aspectRatio: '946 / 532',
                }}
              />
            </div>
          </div>
        </div>

        {/* Map section skeleton */}
        <div className="landing-map-section w-full bg-[#F5F5F7] flex flex-col items-center">
          <div className="landing-map-wrapper relative animate-pulse">
            {/* Mobile map CTA overlay skeleton */}
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-3 md:hidden">
              <div className="w-full max-w-[280px] rounded-[16px] bg-white border border-black/10 px-3 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-[18px] w-[70%] bg-[#E5E5E5] rounded-[6px]" />
                  <div className="h-[18px] w-[50%] bg-[#E5E5E5] rounded-[6px]" />
                </div>
                <div className="mt-2 space-y-2">
                  <div className="h-[10px] w-full bg-[#F0F0F0] rounded-[4px]" />
                  <div className="h-[10px] w-[90%] bg-[#F0F0F0] rounded-[4px]" />
                  <div className="h-[10px] w-[85%] bg-[#F0F0F0] rounded-[4px]" />
                </div>
                <div className="mt-2 flex justify-center">
                  <div className="h-[32px] w-full bg-[#E8F5EA] rounded-[5px]" />
                </div>
              </div>
            </div>
            {/* Map placeholder */}
            <div
              className="bg-[#E8E8E8] rounded-[8px] border-[3px] border-black/20"
              style={{
                width: '100%',
                maxWidth: '1864px',
                aspectRatio: '1864 / 1050',
              }}
            />
          </div>

          {/* "We Did The Research" card skeleton - mobile only */}
          <div className="landing-after-map md:hidden w-full px-4 sm:px-[8%] md:px-[14%]">
            <div className="mx-auto w-full max-w-[904px] rounded-[28px] overflow-hidden bg-[#FAFAFA] animate-pulse">
              {/* Text section */}
              <div className="px-6 xs:px-8 pt-8 xs:pt-10 pb-8 xs:pb-10">
                <div className="h-[32px] xs:h-[36px] sm:h-[42px] w-[70%] bg-[#E5E5E5] rounded-[8px]" />
                <div className="mt-4 space-y-3">
                  <div className="h-[15px] xs:h-[17px] w-full bg-[#F0F0F0] rounded-[6px]" />
                  <div className="h-[15px] xs:h-[17px] w-full bg-[#F0F0F0] rounded-[6px]" />
                  <div className="h-[15px] xs:h-[17px] w-[85%] bg-[#F0F0F0] rounded-[6px]" />
                </div>
                <div className="mt-6 xs:mt-8 h-[44px] xs:h-[48px] w-[200px] bg-[#E8F5EA] rounded-[6px]" />
              </div>
              {/* Demo section */}
              <div
                className="px-4 xs:px-6 pt-8 xs:pt-10 pb-10 xs:pb-12"
                style={{
                  background: 'linear-gradient(180deg, #EAF7FF 0%, #BEE6FF 100%)',
                }}
              >
                <div
                  className="w-full bg-[#C8E8F5] rounded-[12px]"
                  style={{ aspectRatio: '709 / 635' }}
                />
              </div>
            </div>
          </div>

          {/* "Every Reply" card skeleton - mobile only */}
          <div className="md:hidden w-full px-4 sm:px-[8%] md:px-[14%]" style={{ marginTop: '82px' }}>
            <div className="mx-auto w-full max-w-[904px] rounded-[28px] overflow-hidden bg-[#FAFAFA] animate-pulse">
              {/* Text section */}
              <div className="px-6 xs:px-8 pt-8 xs:pt-10 pb-8 xs:pb-10">
                <div className="h-[32px] xs:h-[36px] sm:h-[42px] w-[50%] bg-[#E5E5E5] rounded-[8px]" />
                <div className="mt-4 space-y-3">
                  <div className="h-[15px] xs:h-[17px] w-full bg-[#F0F0F0] rounded-[6px]" />
                  <div className="h-[15px] xs:h-[17px] w-[80%] bg-[#F0F0F0] rounded-[6px]" />
                </div>
                <div className="mt-6 xs:mt-8 h-[44px] xs:h-[48px] w-[180px] bg-[#E8F5EA] rounded-[6px]" />
              </div>
              {/* Demo section */}
              <div
                className="px-4 xs:px-6 pt-8 xs:pt-10 pb-10 xs:pb-12"
                style={{
                  background: 'linear-gradient(180deg, #DBFFE2 0%, #99D8A5 100%)',
                }}
              >
                <div
                  className="w-full bg-[#B8E8C0] rounded-[12px]"
                  style={{ aspectRatio: '856 / 535' }}
                />
              </div>
            </div>
          </div>

          {/* "Emails That Land" card skeleton - mobile only */}
          <div className="md:hidden w-full px-4 sm:px-[8%] md:px-[14%]" style={{ marginTop: '75px' }}>
            <div className="mx-auto w-full max-w-[904px] rounded-[28px] overflow-hidden bg-[#FAFAFA] animate-pulse">
              {/* Text section */}
              <div className="px-6 xs:px-8 pt-8 xs:pt-10 pb-8 xs:pb-10">
                <div className="h-[32px] xs:h-[36px] sm:h-[42px] w-[60%] bg-[#E5E5E5] rounded-[8px]" />
                <div className="mt-4 space-y-3">
                  <div className="h-[15px] xs:h-[17px] w-full bg-[#F0F0F0] rounded-[6px]" />
                  <div className="h-[15px] xs:h-[17px] w-full bg-[#F0F0F0] rounded-[6px]" />
                  <div className="h-[15px] xs:h-[17px] w-[75%] bg-[#F0F0F0] rounded-[6px]" />
                </div>
                <div className="mt-6 xs:mt-8 h-[44px] xs:h-[48px] w-[200px] bg-[#E8F5EA] rounded-[6px]" />
              </div>
              {/* Demo section */}
              <div
                className="px-4 xs:px-6 pt-8 xs:pt-10 pb-10 xs:pb-12"
                style={{
                  background: 'linear-gradient(180deg, #DAE6FE 0%, #CAD5F9 100%)',
                }}
              >
                <div
                  className="w-full bg-[#C0D0F5] rounded-[12px]"
                  style={{ aspectRatio: '904 / 712' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* "Try Murmur Now" CTA section skeleton */}
        <div className="w-full bg-[#F5F5F7] flex flex-col items-center justify-center h-[280px] md:h-[450px] lg:h-[747px] animate-pulse">
          <div className="flex flex-col items-center">
            <div className="h-[clamp(32px,9vw,62px)] w-[280px] sm:w-[350px] bg-[#E5E5E5] rounded-[12px]" />
            <div
              className="mt-[32px] bg-[#E5E5E5] rounded-[8px]"
              style={{ width: '219px', height: '33px' }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
