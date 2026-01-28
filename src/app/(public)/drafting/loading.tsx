'use client';

/**
 * Mobile-specific skeleton loader for the Drafting page.
 * Shows animated placeholder cards that match the mobile layout while the page loads.
 */
export default function DraftingLoading() {
  return (
    <main className="relative bg-[#F5F5F7] overflow-x-hidden landing-page">
      {/* Gradient overlay for first 1935px - matches page.tsx */}
      <div
        className="absolute top-0 left-0 w-full pointer-events-none z-0"
        style={{
          height: '1935px',
          background: 'linear-gradient(to bottom, #D2F2DE, #F5F5F7)',
        }}
      />

      <div className="relative z-10 min-h-screen">
        {/* Hero section skeleton */}
        <div className="relative flex justify-center pt-16 pb-6 lg:pt-[100px] lg:pb-0">
          <div className="w-[calc(100vw-32px)] max-w-[1352px] bg-[#F2FBFF] rounded-[22px] flex flex-col items-center gap-6 px-4 pt-6 pb-6 lg:w-[1352px] lg:h-[823px] lg:px-[46px] lg:pt-[30px] lg:pb-[30px] animate-pulse">
            {/* Title skeleton */}
            <div className="h-[48px] sm:h-[64px] lg:h-[75px] w-[180px] sm:w-[260px] lg:w-[300px] bg-[#E0F4F9] rounded-[12px]" />
            
            {/* DraftingDemo SVG skeleton */}
            <div className="w-full flex-1 min-h-0 flex justify-center">
              <div 
                className="w-full max-w-[1200px] bg-[#E0F4F9] rounded-[12px]"
                style={{ aspectRatio: '1260/693' }}
              />
            </div>
          </div>
        </div>

        {/* Mobile Layout Skeleton - "Tell your story" section */}
        <div className="w-full mt-16 sm:mt-[192px] px-4 sm:px-6 min-[1194px]:hidden">
          <div className="mx-auto w-full max-w-[686px] flex flex-col gap-6">
            {/* Text card skeleton */}
            <div className="bg-white rounded-[34px] px-8 pt-10 pb-12 animate-pulse">
              <div className="h-[24px] w-[55%] bg-[#E5E5E5] rounded-[8px]" />
              <div className="mt-5 space-y-3">
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-[90%] bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-[80%] bg-[#F0F0F0] rounded-[6px]" />
              </div>
            </div>

            {/* ProfileDemo skeleton */}
            <div 
              className="w-full rounded-[22px] overflow-hidden flex items-center justify-center px-4 py-6 animate-pulse"
              style={{
                background: 'linear-gradient(to bottom, #E1D5FF, #F1ECFB)',
              }}
            >
              <div 
                className="w-full max-w-[394px] bg-[#D4C6F5] rounded-[12px]"
                style={{ aspectRatio: '394/366' }}
              />
            </div>
          </div>
        </div>

        {/* Desktop Layout Skeleton - "Tell your story" section */}
        <div className="relative hidden min-[1194px]:flex justify-center mt-[192px] px-4 overflow-visible">
          <div className="flex w-[1355px] h-[424px] gap-[13px]">
            <div className="w-[752px] h-[424px] rounded-[22px] bg-white px-[86px] pt-[74px] animate-pulse">
              <div className="h-[28px] w-[45%] bg-[#E5E5E5] rounded-[8px]" />
              <div className="mt-[24px] space-y-4">
                <div className="h-[23px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[23px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[23px] w-[85%] bg-[#F0F0F0] rounded-[6px]" />
              </div>
            </div>
            <div 
              className="w-[590px] h-[424px] rounded-[22px] flex items-center justify-center animate-pulse"
              style={{ background: 'linear-gradient(to bottom, #E1D5FF, #F1ECFB)' }}
            >
              <div className="w-[394px] h-[366px] bg-[#D4C6F5] rounded-[12px]" />
            </div>
          </div>
        </div>

        {/* Mobile Layout Skeleton - "Drafting Modes" section */}
        <div className="w-full mt-14 sm:mt-[146px] px-4 sm:px-6 min-[1194px]:hidden">
          <div className="mx-auto w-full max-w-[686px] flex flex-col gap-6">
            {/* Text card skeleton */}
            <div className="bg-white rounded-[34px] px-8 pt-10 pb-12 animate-pulse">
              <div className="h-[24px] w-[55%] bg-[#E5E5E5] rounded-[8px]" />
              <div className="mt-5 space-y-3">
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-[85%] bg-[#F0F0F0] rounded-[6px]" />
              </div>
            </div>

            {/* ModesDemo skeleton with 3 mode previews */}
            <div 
              className="w-full rounded-[22px] overflow-hidden px-8 pt-10 pb-12 animate-pulse"
              style={{
                background: 'linear-gradient(to bottom, #ECFFF9, #BFEADC)',
              }}
            >
              <div className="space-y-16">
                {/* Auto mode */}
                <div>
                  <div className="h-[22px] w-[60px] bg-[#A8DBC8] rounded-[6px]" />
                  <div 
                    className="mt-6 w-full bg-[#A8DBC8] rounded-[12px]"
                    style={{ aspectRatio: '329/466' }}
                  />
                </div>

                {/* Manual mode */}
                <div>
                  <div className="h-[22px] w-[120px] bg-[#A8DBC8] rounded-[6px]" />
                  <div 
                    className="mt-6 w-full bg-[#A8DBC8] rounded-[12px]"
                    style={{ aspectRatio: '329/466' }}
                  />
                </div>

                {/* Hybrid mode */}
                <div>
                  <div className="h-[22px] w-[110px] bg-[#A8DBC8] rounded-[6px]" />
                  <div 
                    className="mt-6 w-full bg-[#A8DBC8] rounded-[12px]"
                    style={{ aspectRatio: '329/466' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout Skeleton - "Drafting Modes" section */}
        <div className="relative hidden min-[1194px]:flex justify-center mt-[146px] px-4 overflow-visible">
          <div className="w-[1354px] h-[895px] flex flex-col gap-[13px]">
            <div 
              className="w-full h-[535px] rounded-[22px] flex items-center justify-center overflow-hidden animate-pulse"
              style={{ background: 'linear-gradient(to bottom, #ECFFF9, #BFEADC)' }}
            >
              <div className="w-[1175px] h-[466px] bg-[#A8DBC8] rounded-[12px]" />
            </div>

            <div className="w-full h-[347px] rounded-[22px] bg-white px-[58px] pt-[44px] animate-pulse">
              <div className="h-[28px] w-[200px] bg-[#E5E5E5] rounded-[8px]" />
              <div className="mt-[24px] space-y-4">
                <div className="h-[23px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[23px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[23px] w-[90%] bg-[#F0F0F0] rounded-[6px]" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout Skeleton - "Built-in variation" section */}
        <div className="w-full mt-16 sm:mt-[181px] px-4 sm:px-6 min-[1194px]:hidden">
          <div className="mx-auto w-full max-w-[686px] flex flex-col gap-6">
            {/* Text card skeleton */}
            <div className="bg-white rounded-[34px] px-8 pt-10 pb-12 animate-pulse">
              <div className="h-[24px] w-[60%] bg-[#E5E5E5] rounded-[8px]" />
              <div className="mt-5 space-y-3">
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[16px] w-[80%] bg-[#F0F0F0] rounded-[6px]" />
              </div>
            </div>

            {/* DraftPreviewDemo skeleton with 2 previews */}
            <div 
              className="w-full rounded-[22px] px-8 pt-10 pb-12 animate-pulse"
              style={{
                background: 'linear-gradient(229deg, #EFFDFF -10%, #C2E9EF 90%)',
              }}
            >
              <div className="space-y-10">
                <div 
                  className="w-full bg-[#A8D8E0] rounded-[12px]"
                  style={{ aspectRatio: '393/555' }}
                />
                <div 
                  className="w-full bg-[#A8D8E0] rounded-[12px]"
                  style={{ aspectRatio: '393/555' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout Skeleton - "Built-in variation" section */}
        <div className="relative hidden min-[1194px]:flex justify-center mt-[181px] px-4 overflow-visible">
          <div className="flex w-[1354px] h-[627px] gap-[7px]">
            <div className="w-[527px] h-[627px] rounded-[22px] bg-white px-[58px] pt-[58px] animate-pulse">
              <div className="h-[28px] w-[55%] bg-[#E5E5E5] rounded-[8px]" />
              <div className="mt-[44px] space-y-4">
                <div className="h-[23px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[23px] w-full bg-[#F0F0F0] rounded-[6px]" />
                <div className="h-[23px] w-[85%] bg-[#F0F0F0] rounded-[6px]" />
              </div>
            </div>

            <div 
              className="w-[820px] h-[627px] rounded-[22px] flex items-center justify-center overflow-hidden animate-pulse"
              style={{
                background: 'linear-gradient(229deg, #EFFDFF -10%, #C2E9EF 90%)',
              }}
            >
              <div className="w-[803px] h-[555px] bg-[#A8D8E0] rounded-[12px]" />
            </div>
          </div>
        </div>

        {/* CTA section skeleton - "Try Murmur Now" */}
        <div className="flex flex-col items-center justify-center pt-14 pb-16 sm:pt-16 sm:pb-20 lg:py-0 lg:h-[660px] animate-pulse">
          <div className="h-[40px] sm:h-[56px] lg:h-[62px] w-[280px] sm:w-[350px] lg:w-[400px] bg-[#E5E5E5] rounded-[12px]" />
          <div 
            className="mt-[32px] bg-[#E5E5E5] rounded-[8px]"
            style={{ width: '219px', height: '33px' }}
          />
        </div>
      </div>
    </main>
  );
}
