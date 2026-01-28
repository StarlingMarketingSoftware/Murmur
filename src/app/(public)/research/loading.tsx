'use client';

/**
 * Mobile-specific skeleton loader for the Research page.
 * Shows animated placeholder cards that match the mobile layout while the page loads.
 */
export default function ResearchLoading() {
  return (
    <main className="relative bg-[#F5F5F7] overflow-x-hidden landing-page">
      {/* Gradient overlay for first 1935px - matches page.tsx */}
      <div
        className="absolute top-0 left-0 w-full pointer-events-none z-0"
        style={{
          height: '1935px',
          background: 'linear-gradient(to bottom, #D3F4FF, #F5F5F7)',
        }}
      />

      <div className="relative z-10 min-h-screen">
        {/* Hero section skeleton */}
        <div className="relative flex justify-center pt-16 pb-6 lg:pt-[100px] lg:pb-0">
          <div className="w-[calc(100vw-32px)] max-w-[966px] bg-[#F2FBFF] rounded-[22px] flex flex-col items-center gap-6 px-4 pt-6 pb-6 lg:w-[966px] lg:h-[823px] lg:px-[46px] lg:pt-[30px] lg:pb-[30px] animate-pulse">
            {/* Title skeleton */}
            <div className="h-[48px] sm:h-[64px] lg:h-[75px] w-[200px] sm:w-[280px] lg:w-[320px] bg-[#E0F4F9] rounded-[12px]" />
            
            {/* ResearchDemo SVG skeleton */}
            <div className="w-full flex-1 min-h-0 flex justify-center">
              <div 
                className="w-full max-w-[747px] bg-[#E0F4F9] rounded-[12px]"
                style={{ aspectRatio: '747/640' }}
              />
            </div>
          </div>
        </div>

        {/* Mobile Layout Skeleton - hidden on desktop */}
        <div className="lg:hidden w-full mt-14 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-[686px] flex flex-col gap-6">
            {/* Card 1: From Booking Schedules to Genre */}
            <div className="bg-white rounded-[22px] px-6 py-10 sm:px-10 animate-pulse">
              <div className="h-[24px] w-[75%] bg-[#E5E5E5] rounded-[8px]" />
              <div className="mt-5 space-y-3">
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-[90%] bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-[85%] bg-[#F0F0F0] rounded-[6px]" />
              </div>
            </div>

            {/* Card 2: PanelDemo skeleton */}
            <div className="bg-[#D3F4FF] rounded-[22px] px-4 pt-8 pb-10 sm:px-10 overflow-hidden flex justify-center animate-pulse">
              <div 
                className="w-full max-w-[424px] bg-[#B8E8F5] rounded-[12px]"
                style={{ aspectRatio: '424/758' }}
              />
            </div>

            {/* Card 3: Know the History */}
            <div className="bg-white rounded-[22px] px-6 py-10 sm:px-10 animate-pulse">
              <div className="h-[24px] w-[60%] bg-[#E5E5E5] rounded-[8px]" />
              <div className="mt-5 space-y-3">
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-[80%] bg-[#F0F0F0] rounded-[6px]" />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout Skeleton - hidden on mobile */}
        <div className="relative hidden lg:flex justify-center mt-[180px] px-4 overflow-visible research-feature-scale-wrapper research-feature-scale-wrapper--top">
          <div className="research-feature-scale-inner flex w-[1352px] h-[945px] gap-[20px]">
            <div className="flex h-full w-[745px] flex-col gap-[21px] animate-pulse">
              {/* Left card 1 */}
              <div className="h-[462px] w-[745px] rounded-[22px] bg-white px-[56px] pt-[48px]">
                <div className="h-[28px] w-[65%] bg-[#E5E5E5] rounded-[8px]" />
                <div className="mt-[32px] space-y-4">
                  <div className="h-[21px] w-full bg-[#F0F0F0] rounded-[6px]" />
                  <div className="h-[21px] w-full bg-[#F0F0F0] rounded-[6px]" />
                  <div className="h-[21px] w-[90%] bg-[#F0F0F0] rounded-[6px]" />
                </div>
              </div>

              {/* Left card 2 */}
              <div className="h-[462px] w-[745px] rounded-[22px] bg-white px-[56px] pt-[48px]">
                <div className="h-[28px] w-[45%] bg-[#E5E5E5] rounded-[8px]" />
                <div className="mt-[32px] space-y-4">
                  <div className="h-[21px] w-full bg-[#F0F0F0] rounded-[6px]" />
                  <div className="h-[21px] w-full bg-[#F0F0F0] rounded-[6px]" />
                  <div className="h-[21px] w-[85%] bg-[#F0F0F0] rounded-[6px]" />
                </div>
              </div>
            </div>

            {/* Right PanelDemo skeleton */}
            <div className="h-[945px] w-[587px] rounded-[22px] bg-[#D3F4FF] flex items-center justify-center overflow-hidden animate-pulse">
              <div className="w-[424px] bg-[#B8E8F5] rounded-[12px]" style={{ height: '758px' }} />
            </div>
          </div>
        </div>

        {/* Mobile: "The Details Matter" skeleton */}
        <div className="lg:hidden w-full mt-12 px-4 sm:px-6">
          <div className="mx-auto w-full max-w-[686px] flex flex-col gap-6">
            <div className="bg-[#D7E7FF] rounded-[22px] px-6 pt-10 pb-10 sm:px-10 animate-pulse">
              <div className="h-[24px] w-[55%] bg-[#C0D4F5] rounded-[8px]" />
              <div className="mt-8 flex justify-center overflow-hidden">
                <div 
                  className="w-full max-w-[520px] bg-[#C0D4F5] rounded-[12px]"
                  style={{ aspectRatio: '520/400' }}
                />
              </div>
            </div>

            <div className="bg-white rounded-[22px] px-6 py-10 sm:px-10 animate-pulse">
              <div className="space-y-3">
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-[85%] bg-[#F0F0F0] rounded-[6px]" />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: "The Details Matter" skeleton */}
        <div className="relative hidden lg:flex justify-center mt-[82px] px-4 overflow-visible research-feature-scale-wrapper research-feature-scale-wrapper--details">
          <div className="research-feature-scale-inner flex flex-col w-[1363px] h-[989px] animate-pulse">
            <div className="w-full h-[110px] rounded-[22px] bg-white flex items-center px-[56px]">
              <div className="h-[28px] w-[250px] bg-[#E5E5E5] rounded-[8px]" />
            </div>

            <div className="mt-[9px] w-full h-[651px] rounded-[22px] bg-[#D7E7FF] flex items-center justify-center overflow-hidden">
              <div className="w-[80%] h-[85%] bg-[#C0D4F5] rounded-[12px]" />
            </div>

            <div className="mt-[19px] w-full h-[200px] rounded-[22px] bg-white flex items-center justify-start px-[56px]">
              <div className="space-y-4 w-full max-w-[1200px]">
                <div className="h-[23px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[23px] w-[90%] bg-[#F0F0F0] rounded-[6px]" />
              </div>
            </div>
          </div>
        </div>

        {/* CTA section skeleton */}
        <div className="flex flex-col items-center justify-center pt-14 pb-16 sm:pt-16 sm:pb-20 lg:py-0 lg:h-[660px] animate-pulse">
          <div className="h-[40px] sm:h-[56px] lg:h-[62px] w-[280px] sm:w-[350px] lg:w-[400px] bg-[#E5E5E5] rounded-[12px]" />
          <div 
            className="mt-[32px] bg-[#E5E5E5] rounded-full"
            style={{ width: '219px', height: '33px' }}
          />
        </div>
      </div>
    </main>
  );
}
