import { useEffect } from 'react';

/**
 * Google AdSense component
 * Note: Requires AdSense approval and publisher ID
 * Replace 'ca-pub-XXXXXXXXXXXXXXXX' with your actual publisher ID once approved
 */
export default function AdSenseAd({ slot, format = 'auto', style = {} }) {
  useEffect(() => {
    try {
      // Push ad to AdSense
      if (window.adsbygoogle && process.env.NODE_ENV === 'production') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  // Only show ads in production
  if (process.env.NODE_ENV !== 'production') {
    return (
      <div className="bg-slate-100 border border-slate-300  p-8 text-center">
        <p className="text-sm text-slate-500">
          📢 Ad Placeholder (Development Mode)
        </p>
        <p className="text-xs text-slate-400 mt-1">
          AdSense ads will appear here in production
        </p>
      </div>
    );
  }

  return (
    <div className="adsense-container my-4">
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          textAlign: 'center',
          ...style,
        }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with your publisher ID
        data-ad-slot={slot || ""}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
