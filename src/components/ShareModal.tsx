/**
 * Rise of the Raccoons! - Share Modal
 * Interactive social sharing with Native Web Share API + Copy to Clipboard fallback.
 */

import React, { useState } from 'react';
import { X, Share2, Copy, Check, MessageSquare, Twitter, Sparkles } from 'lucide-react';

interface ShareModalProps {
  onClose: () => void;
  bestFloor?: number;
}

export const ShareModal: React.FC<ShareModalProps> = ({ onClose, bestFloor = 1 }) => {
  const [copied, setCopied] = useState(false);

  const shareTitle = 'Rise of the Raccoons!';
  const shareText = `I'm climbing a 25-floor skyscraper as a sneaky trash panda in Rise of the Raccoons! Can you reach the rooftop water tower? 🦝🏙️`;
  const shareUrl = window.location.href;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = `${shareText}\n${shareUrl}`;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed, fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md pointer-events-auto select-none"
    >
      <div className="w-full max-w-sm max-h-[90vh] bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight leading-none">
                SHARE GAME
              </h2>
              <span className="text-[10px] text-emerald-400 font-semibold tracking-wide uppercase">
                Challenge Your Friends
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 sm:space-y-4 text-slate-300 text-xs">
          {/* Card preview */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-base">🦝 🏙️ 🍕</span>
              <span className="text-[10px] font-bold text-amber-400 font-mono-nums">
                BEST: FLOOR {bestFloor}/25
              </span>
            </div>
            <p className="text-[11px] text-slate-200 italic leading-relaxed">
              "{shareText}"
            </p>
          </div>

          {/* Quick Share Buttons */}
          <div className="space-y-2">
            {/* Native / Main Share Button */}
            <button
              onClick={handleNativeShare}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Link</span>
            </button>

            {/* Social Channels */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleTwitterShare}
                className="py-2.5 px-3 rounded-xl font-semibold text-xs text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Twitter className="w-3.5 h-3.5 text-sky-400" />
                <span>Share on X</span>
              </button>

              <button
                onClick={handleWhatsAppShare}
                className="py-2.5 px-3 rounded-xl font-semibold text-xs text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp</span>
              </button>
            </div>

            {/* Copy to Clipboard Button */}
            <button
              onClick={handleCopyLink}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                copied
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold">Copied to Clipboard! 📋</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy Game Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/80 text-center">
          <p className="text-[10px] text-slate-400">
            Invite friends to see who can reach the penthouse first!
          </p>
        </div>
      </div>
    </div>
  );
};
