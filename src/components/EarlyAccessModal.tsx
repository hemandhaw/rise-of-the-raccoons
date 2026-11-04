/**
 * Rise of the Raccoons! - Early Access Club Modal
 * Centered sub-menu HTML overlay on top of the game canvas with embedded Google Form
 */

import React, { useState } from 'react';
import { X, ExternalLink, Sparkles, Loader2, Star } from 'lucide-react';

interface EarlyAccessModalProps {
  onClose: () => void;
}

export const EarlyAccessModal: React.FC<EarlyAccessModalProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  // Official embedded Google Form URL from https://forms.gle/169cLuEKd9r451J68
  const embedUrl =
    'https://docs.google.com/forms/d/e/1FAIpQLSeXCX5AQFU-iNT86j74dwhz5m1irUfngkp4XNXDd5y8Umtj9Q/viewform?embedded=true';
  const directUrl = 'https://forms.gle/169cLuEKd9r451J68';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-2 xs:p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl h-[92vh] max-h-[780px] bg-[#18181b] border-2 border-[#facc15] rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-[#fdf6ed]">
        
        {/* Top Header Bar with prominent Close button */}
        <div className="shrink-0 flex items-center justify-between px-3 xs:px-4 sm:px-5 py-2.5 xs:py-3 bg-gradient-to-r from-[#27272a] via-[#1f1d14] to-[#27272a] border-b border-[#facc15]/40">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-[#facc15] shrink-0">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm xs:text-base sm:text-lg font-black text-white tracking-tight truncate flex items-center gap-1.5">
                  Early Access Club!
                </h3>
                <span className="px-1.5 py-0.2 xs:py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#eab308] to-[#ea580c] text-white rounded-full border border-yellow-300/40">
                  Exclusive
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
            {/* Optional external link button */}
            <a
              href={directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xs:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Open form in new window"
            >
              <span>New Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Clear 'Close' button at the top of the overlay */}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#e51a24] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer active:scale-95"
              aria-label="Close Early Access Club overlay"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Required Prompt Text Callout Banner */}
        <div className="shrink-0 px-3 xs:px-4 sm:px-5 py-2.5 xs:py-3 bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border-b border-amber-500/30 text-amber-100 shadow-inner">
          <div className="flex items-start gap-2 sm:gap-2.5">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm leading-snug sm:leading-relaxed font-medium">
              <strong className="text-amber-300 font-bold">Adult climbers and parents:</strong> Join the Rise of the Raccoons! Early Access Club! Drop your email to get behind-the-scenes updates, help shape the game, and unlock an exclusive founders-only reward at launch.
            </p>
          </div>
        </div>

        {/* Embedded Google Form Container */}
        <div className="relative flex-1 w-full bg-slate-900 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900 text-slate-300 z-10">
              <Loader2 className="w-8 h-8 text-[#facc15] animate-spin" />
              <span className="text-xs font-mono-nums">Loading Early Access Form...</span>
            </div>
          )}

          <iframe
            src={embedUrl}
            title="Rise of the Raccoons Early Access Club Form"
            width="100%"
            height="100%"
            className="w-full h-full border-0 select-text"
            onLoad={() => setIsLoading(false)}
          >
            Loading form...
          </iframe>
        </div>

        {/* Footer info & fallback link */}
        <div className="shrink-0 px-3 xs:px-4 py-1.5 sm:py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] sm:text-xs text-slate-400">
          <span>Rise of the Raccoons · Early Access Club</span>
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#38bdf8] hover:underline flex items-center gap-1 font-medium"
          >
            <span>Open in new window</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
