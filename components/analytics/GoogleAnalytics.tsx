import Script from 'next/script';

/**
 * Google Analytics 4 (Jennifer / Amy, burn-down 9-28 row 36; installed
 * 10-12-26). Renders nothing unless NEXT_PUBLIC_GA_MEASUREMENT_ID is set, so
 * local dev and preview deployments never report. Runs alongside Vercel Web
 * Analytics, which still feeds the Monthly Report; GA4 is for Amy's HRSA
 * pulls (engagement time, landing pages, channels, returning visitors).
 *
 * `afterInteractive` keeps the tag off the critical path. Page views on
 * App Router client navigations are sent by GA4's own history-change
 * enhanced measurement (on by default for a web data stream).
 */
export default function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
