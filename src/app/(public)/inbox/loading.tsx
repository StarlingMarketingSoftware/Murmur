'use client';

/**
 * Mobile-specific skeleton loader for the Inbox landing page.
 * Shows animated placeholder cards that match the mobile layout while the page loads.
 */
export default function InboxLoading() {
  return (
    <main className="relative bg-[#F5F5F7] overflow-x-hidden landing-page">
      {/* Gradient overlay matching the page */}
      <div
        className="absolute top-0 left-0 w-full pointer-events-none z-0"
        style={{
          height: '1935px',
          background: 'linear-gradient(to bottom, #D3E9FF, #F5F5F7)',
        }}
      />

      <div className="relative z-10 min-h-screen">
        {/* Hero Section Skeleton */}
        <div className="relative flex justify-center pt-16 pb-6 lg:pt-[100px] lg:pb-0">
          <div className="w-[calc(100vw-32px)] max-w-[1160px] bg-[#F2FBFF] rounded-[22px] flex flex-col items-center gap-6 px-4 pt-6 pb-6 lg:w-[1160px] lg:h-[823px] lg:px-[46px] lg:pt-[30px] lg:pb-[30px] animate-pulse">
            {/* Title skeleton */}
            <div className="h-[40px] sm:h-[56px] lg:h-[65px] w-[180px] sm:w-[220px] lg:w-[260px] bg-[#D8ECFF] rounded-[10px]" />
            {/* InboxDemo SVG skeleton */}
            <div
              className="w-full flex-1 min-h-[300px] bg-[#E5F4FF] rounded-[16px]"
              style={{ aspectRatio: '1068 / 693' }}
            />
          </div>
        </div>

        {/* "Never miss a reply" Section - Mobile Skeleton */}
        <div className="xl:hidden w-full mt-16 md:mt-[102px] px-4 sm:px-[8%] md:px-[14%]">
          <div className="mx-auto w-full max-w-[904px]">
            {/* Text card skeleton */}
            <div className="bg-white rounded-[22px] px-6 xs:px-8 sm:px-10 pt-10 pb-12 animate-pulse">
              {/* Heading skeleton */}
              <div className="h-[20px] w-[180px] bg-[#E8E8E8] rounded-[6px]" />
              {/* Text skeleton */}
              <div className="mt-5 space-y-3">
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[4px]" />
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[4px]" />
                <div className="h-[16px] w-[85%] bg-[#F0F0F0] rounded-[4px]" />
              </div>
            </div>

            {/* InboundDemo skeleton */}
            <div
              className="mt-6 rounded-[22px] overflow-hidden flex items-center justify-center px-4 py-6 animate-pulse"
              style={{ background: 'linear-gradient(to bottom, #DFF2F4, #B9EDFD)' }}
            >
              <div
                className="w-full bg-[#C8E8F0] rounded-[12px]"
                style={{ aspectRatio: '834 / 466' }}
              />
            </div>
          </div>
        </div>

        {/* "Never miss a reply" Section - Desktop Skeleton */}
        <div className="relative hidden xl:flex justify-center mt-[102px] px-4 overflow-visible animate-pulse">
          <div className="flex w-[1363px] h-[599px] gap-[11px]">
            {/* Text card skeleton */}
            <div className="shrink-0 w-[439px] h-[599px] bg-white rounded-[22px] px-[56px] pt-[78px]">
              <div className="h-[24px] w-[200px] bg-[#E8E8E8] rounded-[6px]" />
              <div className="mt-[32px] space-y-6">
                <div className="h-[21px] w-full bg-[#F0F0F0] rounded-[4px]" />
                <div className="h-[21px] w-full bg-[#F0F0F0] rounded-[4px]" />
                <div className="h-[21px] w-[90%] bg-[#F0F0F0] rounded-[4px]" />
                <div className="h-[21px] w-[70%] bg-[#F0F0F0] rounded-[4px]" />
              </div>
            </div>
            {/* Demo skeleton */}
            <div
              className="shrink-0 w-[913px] h-[599px] rounded-[22px] flex items-center justify-center"
              style={{ background: 'linear-gradient(to bottom, #DFF2F4, #B9EDFD)' }}
            >
              <div className="w-[834px] h-[466px] bg-[#C8E8F0] rounded-[12px]" />
            </div>
          </div>
        </div>

        {/* "Respond from Within Campaigns" Section - Mobile Skeleton */}
        <div className="xl:hidden w-full mt-16 md:mt-[97px] px-4 sm:px-[8%] md:px-[14%]">
          <div className="mx-auto w-full max-w-[904px]">
            {/* Text card skeleton */}
            <div className="bg-white rounded-[22px] px-6 xs:px-8 sm:px-10 pt-10 pb-12 animate-pulse">
              {/* Heading skeleton */}
              <div className="h-[20px] w-[280px] bg-[#E8E8E8] rounded-[6px]" />
              {/* Text skeleton */}
              <div className="mt-5 space-y-3">
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[4px]" />
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[4px]" />
                <div className="h-[16px] w-full bg-[#F0F0F0] rounded-[4px]" />
                <div className="h-[16px] w-[80%] bg-[#F0F0F0] rounded-[4px]" />
              </div>
            </div>

            {/* ReplyInbox panels skeleton */}
            <div
              className="mt-6 rounded-[22px] overflow-hidden px-4 py-6 animate-pulse"
              style={{ background: 'linear-gradient(to bottom, #C3E8C9, #AFF1B8)' }}
            >
              <div className="space-y-6">
                {/* Left panel skeleton */}
                <div
                  className="w-full bg-[#B0DEB8] rounded-[12px]"
                  style={{ aspectRatio: '650 / 498' }}
                />
                {/* Right panel skeleton */}
                <div
                  className="w-full bg-[#A5D8AE] rounded-[12px]"
                  style={{ aspectRatio: '650 / 498' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* "Respond from Within Campaigns" Section - Desktop Skeleton */}
        <div className="relative hidden xl:flex justify-center mt-[97px] px-4 overflow-visible animate-pulse">
          <div className="w-[1383px] h-[939px] flex flex-col items-center">
            {/* Subject header skeleton */}
            <div className="w-[1383px] h-[102px] bg-white rounded-[22px] flex items-center justify-center">
              <div className="h-[24px] w-[350px] bg-[#E8E8E8] rounded-[6px]" />
            </div>

            {/* Demo area skeleton */}
            <div
              className="mt-[13px] w-[1363px] h-[542px] rounded-[22px] flex items-center justify-center"
              style={{ background: 'linear-gradient(to bottom, #C3E8C9, #AFF1B8)' }}
            >
              <div className="w-[1280px] h-[466px] bg-[#A8DEB2] rounded-[12px]" />
            </div>

            {/* Text description skeleton */}
            <div className="mt-[15px] w-[1363px] h-[267px] bg-white rounded-[22px] flex items-start px-[56px] pt-[32px]">
              <div className="space-y-6 w-full">
                <div className="h-[21px] w-full bg-[#F0F0F0] rounded-[4px]" />
                <div className="h-[21px] w-full bg-[#F0F0F0] rounded-[4px]" />
                <div className="h-[21px] w-full bg-[#F0F0F0] rounded-[4px]" />
                <div className="h-[21px] w-[60%] bg-[#F0F0F0] rounded-[4px]" />
              </div>
            </div>
          </div>
        </div>

        {/* "Try Murmur Now" CTA Section Skeleton */}
        <div className="flex flex-col items-center justify-center pt-14 pb-16 sm:pt-16 sm:pb-20 lg:py-0 lg:h-[660px] animate-pulse">
          {/* Headline skeleton */}
          <div className="h-[clamp(32px,9vw,62px)] w-[280px] sm:w-[350px] bg-[#E5E5E5] rounded-[12px]" />
          {/* Button skeleton */}
          <div
            className="mt-[32px] bg-[#E5E5E5] rounded-[8px]"
            style={{ width: '219px', height: '33px' }}
          />
        </div>
      </div>
    </main>
  );
}
