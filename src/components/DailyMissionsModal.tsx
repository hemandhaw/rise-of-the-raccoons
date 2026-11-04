/**
 * Rise of the Raccoons! - Daily Missions Modal
 * Displays the 3 active challenges for today with progress bars, reset countdown, and rewards.
 */

import React, { useState, useEffect } from 'react';
import { Target, X, CheckCircle2, Clock, Star, Play, Sparkles, Award } from 'lucide-react';
import {
  DailyMission,
  DailyMissionsData,
  loadDailyMissions,
  claimMissionReward,
  setAutoShowMissions,
  getTimeUntilMidnight,
} from '../game/dailyMissions';
import { sound } from '../game/audio';

interface DailyMissionsModalProps {
  onClose: () => void;
  onStartGame?: () => void;
  isGameStart?: boolean; // True when automatically shown before gameplay starts
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  onClose,
  onStartGame,
  isGameStart = false,
}) => {
  const [data, setData] = useState<DailyMissionsData>(() => loadDailyMissions());
  const [timeRemaining, setTimeRemaining] = useState<string>(getTimeUntilMidnight());
  const [autoShow, setAutoShow] = useState<boolean>(() => data.autoShowOnStart ?? true);
  const [celebratingMissionId, setCelebratingMissionId] = useState<string | null>(null);

  // Update countdown timer every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getTimeUntilMidnight());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Listen for storage updates
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<DailyMissionsData>;
      if (customEvent.detail) {
        setData(customEvent.detail);
      }
    };
    window.addEventListener('rotr_missions_updated', handler);
    return () => window.removeEventListener('rotr_missions_updated', handler);
  }, []);

  const handleClaim = (mission: DailyMission) => {
    sound.playCelebrationFanfare();
    setCelebratingMissionId(mission.id);
    const updated = claimMissionReward(mission.id);
    setData(updated);
    setTimeout(() => setCelebratingMissionId(null), 1200);
  };

  const handleToggleAutoShow = (checked: boolean) => {
    setAutoShow(checked);
    setAutoShowMissions(checked);
  };

  const handleAction = () => {
    if (isGameStart && onStartGame) {
      onStartGame();
    }
    onClose();
  };

  // Format today's human-readable date
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const completedCount = data.missions.filter((m) => m.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-[#18181b] border-2 border-[#ea733d]/70 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.9)] text-[#fdf6ed] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Decorative Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#e51a24] via-[#ea733d] to-[#facc15]" />

        {/* Modal Header */}
        <div className="shrink-0 p-3.5 sm:p-5 pb-2.5 sm:pb-3 flex items-start justify-between border-b border-[#3f3f46]/50 bg-[#27272a]/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#e51a24]/20 border border-[#e51a24]/40 text-[#facc15]">
                <Target className="w-5 h-5 text-[#ea733d]" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight flex items-center gap-2">
                  DAILY MISSIONS
                  <span className="text-xs font-mono-nums font-bold px-2 py-0.5 rounded-full bg-[#facc15]/20 text-[#facc15] border border-[#facc15]/40">
                    {completedCount} / 3 DONE
                  </span>
                </h2>
                <div className="flex items-center gap-2 text-xs font-mono-nums text-[#94a3b8] mt-0.5">
                  <span>📅 {todayFormatted}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[#38bdf8]">
                    <Clock className="w-3.5 h-3.5" />
                    Resets in {timeRemaining}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Total Star Points Badge */}
            <div className="hidden xs:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#27272a] border border-[#facc15]/50 text-[#facc15] font-mono-nums font-black text-xs shadow-inner">
              <Star className="w-3.5 h-3.5 fill-[#facc15]" />
              <span>{data.totalStars}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#94a3b8] hover:text-[#fdf6ed] hover:bg-[#27272a] border border-transparent hover:border-[#3f3f46] transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Missions List */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
          {data.missions.map((mission) => {
            const pct = Math.min(100, Math.round((mission.current / mission.target) * 100));
            const isCelebrating = celebratingMissionId === mission.id;

            return (
              <div
                key={mission.id}
                className={`relative p-3.5 sm:p-4 rounded-xl border transition-all ${
                  mission.completed
                    ? 'bg-gradient-to-r from-[#14532d]/40 to-[#18181b] border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                    : 'bg-[#27272a]/70 border-[#3f3f46]/60 hover:border-[#ea733d]/40'
                } ${isCelebrating ? 'scale-[1.02] border-[#facc15] ring-2 ring-[#facc15]/50' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#18181b] border border-[#3f3f46] flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
                      {mission.icon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-white">
                          {mission.title}
                        </h3>
                        {mission.completed && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase text-[#4ade80] bg-[#16a34a]/20 px-1.5 py-0.5 rounded border border-[#22c55e]/40">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#cbd5e1] mt-0.5 leading-snug">
                        {mission.description}
                      </p>
                    </div>
                  </div>

                  {/* Reward Badge or Claim Button */}
                  <div className="flex-shrink-0">
                    {mission.completed && !mission.claimed ? (
                      <button
                        onClick={() => handleClaim(mission)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#ea580c] hover:brightness-110 text-white font-mono-nums font-black text-xs shadow-lg transition-all animate-pulse cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>CLAIM +{mission.reward}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#18181b] border border-[#3f3f46] font-mono-nums text-xs font-bold text-[#facc15]">
                        <Star className="w-3 h-3 fill-[#facc15]" />
                        <span>+{mission.reward}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Counter */}
                <div className="mt-3 pt-2.5 border-t border-[#3f3f46]/30 flex items-center justify-between gap-3">
                  <div className="flex-1 bg-[#18181b] h-2 rounded-full overflow-hidden border border-[#3f3f46]/40">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        mission.completed
                          ? 'bg-[#22c55e]'
                          : pct >= 50
                          ? 'bg-[#facc15]'
                          : 'bg-[#ea733d]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <span className="text-xs font-mono-nums font-black text-[#cbd5e1] whitespace-nowrap">
                    {mission.current} / {mission.target} {mission.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer - shrink-0 to guarantee button is never clipped */}
        <div className="shrink-0 p-3 sm:p-5 pt-2.5 sm:pt-3 border-t border-[#3f3f46]/50 bg-[#27272a]/40 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <label className="flex items-center gap-2 text-[11px] sm:text-xs text-[#94a3b8] cursor-pointer hover:text-[#fdf6ed] transition-colors select-none">
            <input
              type="checkbox"
              checked={autoShow}
              onChange={(e) => handleToggleAutoShow(e.target.checked)}
              className="rounded bg-[#18181b] border-[#3f3f46] text-[#ea733d] focus:ring-[#ea733d] cursor-pointer"
            />
            <span>Show missions when starting climb</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleAction}
              className="w-full sm:w-auto px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#e51a24] to-[#ea580c] hover:brightness-110 text-white font-mono-nums font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
              <span>{isGameStart ? "LET'S CLIMB! 🐾" : 'CLOSE'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
