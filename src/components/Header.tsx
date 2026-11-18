import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  ShoppingCart,
  Shuffle,
  Volume2,
  Repeat1,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MusicTrack } from '../data/tracks';

export type ActiveTab = 'catalog' | 'reviews';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  favoritesCount: number;
  cartCount: number;
  onOpenFavorites: () => void;
  onOpenCart: () => void;
  tracks: MusicTrack[];
  currentTrackIndex: number;
  isPlaying: boolean;
  isShuffle: boolean;
  isRepeatOne: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onTogglePlay: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onToggleShuffle: () => void;
  onToggleRepeatOne: () => void;
  onSelectTrack: (index: number) => void;
  onSeek: (time: number) => void;
  onVolumeChange: (val: number) => void;
  isAdmin: boolean;
  onAdminClick: () => void;
  onAdminLogout: () => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  favoritesCount,
  cartCount,
  onOpenFavorites,
  onOpenCart,
  tracks,
  currentTrackIndex,
  isPlaying,
  isShuffle,
  isRepeatOne,
  currentTime,
  duration,
  volume,
  onTogglePlay,
  onPrevTrack,
  onNextTrack,
  onToggleShuffle,
  onToggleRepeatOne,
  onSelectTrack,
  onSeek,
  onVolumeChange,
  isAdmin,
  onAdminClick,
  onAdminLogout,
}) => {
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const currentTrack = tracks[currentTrackIndex] ?? tracks[0];
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (playerRef.current && !playerRef.current.contains(e.target as Node)) {
        setPlaylistOpen(false);
      }
    };
    if (playlistOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [playlistOpen]);

  return (
    <header className="w-full max-w-[1660px] mx-auto px-3 sm:px-4 md:px-[clamp(16px,2.7vw,44px)] pt-[max(0.5rem,env(safe-area-inset-top))] md:pt-[0.6vw] pb-2 md:pb-[0.8vw] relative z-20">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3.5 sm:gap-4 md:gap-[clamp(10px,1.5vw,24px)]">
        {/* Left: Logo + Title block underneath */}
        <div className="flex flex-col items-center shrink-0">
          <div className="w-[min(270px,78vw)] sm:w-[320px] md:w-[clamp(160px,23.5vw,416px)] select-none">
            <img
              src="/assets/sakura-logo.png"
              alt="Sakura Pets"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-contain"
            />
          </div>

          <div className="flex flex-col items-center w-full -mt-1 md:-mt-[0.35vw]">
            <div className="flex items-center gap-2 md:gap-[0.6vw]">
              <h1 className="text-[26px] sm:text-[28px] md:text-[clamp(18px,2.05vw,34px)] font-normal tracking-[-0.01em] text-[#8F3B68] leading-none">
                {activeTab === 'catalog' ? 'каталог' : 'отзывы'}
              </h1>
              <svg
                viewBox="0 0 24 22"
                aria-hidden="true"
                className="w-[21px] h-[19px] sm:w-[22px] sm:h-[20px] md:w-[clamp(14px,1.55vw,26px)] md:h-[clamp(13px,1.43vw,24px)] translate-y-[1px]"
              >
                <defs>
                  <linearGradient id="catalogHeartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F9A8D4" />
                    <stop offset="100%" stopColor="#E67BB4" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#catalogHeartGrad)"
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                />
              </svg>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-1 md:mt-[0.35vw] text-[12.5px] sm:text-[13px] md:text-[clamp(10px,0.9vw,15px)] text-[#A9517F] font-normal whitespace-nowrap">
              <span>
                {activeTab === 'catalog' ? 'все питомцы в наличии' : 'пруфы и отзывы выдачи'}
              </span>
              <Heart className="w-3.5 h-3.5 md:w-[clamp(10px,0.85vw,14px)] md:h-[clamp(10px,0.85vw,14px)] text-[#A9517F] stroke-[2] shrink-0" />
            </div>
          </div>
        </div>

        {/* Center + Right controls */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between flex-1 min-w-0 md:pt-[clamp(14px,1.9vw,32px)] gap-3 md:gap-[clamp(8px,1.4vw,24px)] w-full">
          {/* Center Navigation Pill */}
          <div className="w-full md:w-auto md:mx-auto flex justify-center">
            <nav
              aria-label="Основная навигация"
              className="inline-flex items-center p-0 h-[52px] sm:h-[58px] w-full max-w-[320px] md:h-[clamp(42px,4.4vw,76px)] md:w-[clamp(204px,28.5vw,490px)] md:max-w-none rounded-full bg-white/95 backdrop-blur-md border border-white shadow-[0_6px_22px_rgba(235,160,205,0.34)] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => onTabChange('catalog')}
                aria-pressed={activeTab === 'catalog'}
                className="flex items-center justify-center gap-2 sm:gap-2.5 md:gap-[0.65vw] h-full w-[52%] rounded-full text-[15px] sm:text-[17px] md:text-[clamp(12px,1.2vw,21px)] font-normal text-[#6D1140] whitespace-nowrap shrink-0 cursor-pointer transition-all duration-200"
                style={
                  activeTab === 'catalog'
                    ? {
                        background: 'linear-gradient(180deg, #FFEAF7 0%, #FAD1EB 100%)',
                        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.85)',
                      }
                    : undefined
                }
              >
                <svg
                  viewBox="0 0 24 22"
                  fill="currentColor"
                  aria-hidden="true"
                  className="w-[18px] h-[16px] sm:w-[20px] sm:h-[18px] md:w-[clamp(13px,1.35vw,24px)] md:h-[clamp(12px,1.25vw,22px)] shrink-0"
                >
                  <path d="M12 1.6L1.8 10.1a1 1 0 00.64 1.77H4.5v8.13A1.5 1.5 0 006 21.5h3.75v-5.75a1.25 1.25 0 011.25-1.25h2a1.25 1.25 0 011.25 1.25V21.5H18a1.5 1.5 0 001.5-1.5v-8.13h2.06a1 1 0 00.64-1.77L12 1.6z" />
                </svg>
                <span>каталог</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('reviews')}
                aria-pressed={activeTab === 'reviews'}
                className="flex items-center justify-center gap-2 sm:gap-2.5 md:gap-[0.65vw] h-full flex-1 rounded-full text-[15px] sm:text-[17px] md:text-[clamp(12px,1.2vw,21px)] font-normal text-[#6D1140] whitespace-nowrap shrink-0 cursor-pointer transition-all duration-200"
                style={
                  activeTab === 'reviews'
                    ? {
                        background: 'linear-gradient(180deg, #FFEAF7 0%, #FAD1EB 100%)',
                        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.85)',
                      }
                    : undefined
                }
              >
                <svg
                  viewBox="0 0 24 22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="w-[18px] h-[16px] sm:w-[20px] sm:h-[18px] md:w-[clamp(13px,1.35vw,24px)] md:h-[clamp(12px,1.25vw,22px)] shrink-0"
                >
                  <path d="M21 10.5c0 4.42-4.03 8-9 8-1.45 0-2.82-.31-4.03-.85L3 19.5l1.34-3.79C3.49 14.27 3 12.46 3 10.5c0-4.42 4.03-8 9-8s9 3.58 9 8z" />
                </svg>
                <span>отзывы</span>
              </button>
            </nav>
          </div>

          {/* Right Controls Column */}
          <div className="flex flex-col items-center md:items-end gap-3 md:gap-[clamp(8px,1.1vw,20px)] shrink-0 max-w-full">
            <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-2.5 md:gap-[clamp(6px,0.9vw,16px)] max-w-full">
              {/* Music Player Pill */}
              <div ref={playerRef} className="relative max-w-full">
                <div className="flex items-center gap-1.5 sm:gap-3 md:gap-[clamp(8px,1.15vw,22px)] h-[48px] sm:h-[58px] md:h-[clamp(42px,4.4vw,76px)] pl-2 pr-2.5 sm:pl-2.5 sm:pr-5 md:pl-[clamp(7px,0.8vw,14px)] md:pr-[clamp(11px,1.5vw,28px)] rounded-full bg-white/95 backdrop-blur-md border border-white shadow-[0_6px_22px_rgba(235,160,205,0.34)]">
                  {/* Pink Glossy CD Disc — opens full beautiful player */}
                  <button
                    type="button"
                    onClick={() => setPlaylistOpen((v) => !v)}
                    title={`${currentTrack.title} — ${currentTrack.artist} (выбрать песню)`}
                    aria-label="Открыть музыкальный плеер"
                    aria-expanded={playlistOpen}
                    className={`w-[34px] h-[34px] sm:w-[42px] sm:h-[42px] md:w-[clamp(26px,2.9vw,50px)] md:h-[clamp(26px,2.9vw,50px)] rounded-full relative flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-105 ${
                      isPlaying ? 'animate-disc-spin' : ''
                    }`}
                    style={{
                      background:
                        'conic-gradient(from 40deg, #FDEAF6, #F6A8D8, #FFF1FA, #F59CD3, #FCE3F3, #F7B7DF, #FDEAF6)',
                      boxShadow:
                        'inset 0 0 0 1.5px rgba(240,165,210,0.6), 0 2px 8px rgba(230,150,195,0.28)',
                    }}
                  >
                    <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-[clamp(9px,0.95vw,16px)] md:h-[clamp(9px,0.95vw,16px)] rounded-full bg-white/90 flex items-center justify-center shadow-inner">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E89AC7]" />
                    </span>
                  </button>

                  {/* Previous Track */}
                  <button
                    type="button"
                    onClick={onPrevTrack}
                    aria-label="Предыдущий трек"
                    className="p-1 text-[#701142] hover:scale-110 active:scale-95 transition cursor-pointer"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-[13px] h-[13px] sm:w-[14px] sm:h-[14px] md:w-[clamp(10px,0.95vw,16px)] md:h-[clamp(10px,0.95vw,16px)]"
                    >
                      <rect x="2" y="2.5" width="2.3" height="11" rx="0.8" />
                      <path d="M13.5 3.1a.6.6 0 00-.94-.5L5.6 7.5a.6.6 0 000 1l6.96 4.9a.6.6 0 00.94-.5V3.1z" />
                    </svg>
                  </button>

                  {/* Play/Pause */}
                  <button
                    type="button"
                    onClick={onTogglePlay}
                    aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
                    className="p-1 text-[#701142] hover:scale-110 active:scale-95 transition cursor-pointer"
                  >
                    {isPlaying ? (
                      <svg
                        viewBox="0 0 18 18"
                        fill="currentColor"
                        className="w-[16px] h-[14px] sm:w-[18px] sm:h-[15px] md:w-[clamp(12px,1.25vw,22px)] md:h-[clamp(10px,1.08vw,18px)]"
                      >
                        <rect x="3.5" y="2.5" width="3.8" height="13" rx="1" />
                        <rect x="10.7" y="2.5" width="3.8" height="13" rx="1" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 22 18"
                        fill="currentColor"
                        className="w-[16px] h-[14px] sm:w-[18px] sm:h-[15px] md:w-[clamp(12px,1.25vw,22px)] md:h-[clamp(10px,1.08vw,18px)]"
                      >
                        <rect x="2" y="2.5" width="3.2" height="13" rx="0.9" />
                        <rect x="7.4" y="2.5" width="3.2" height="13" rx="0.9" />
                        <path d="M12.2 4.2a.6.6 0 01.95-.48l6.2 4.5a.6.6 0 010 .96l-6.2 4.5a.6.6 0 01-.95-.48V4.2z" />
                      </svg>
                    )}
                  </button>

                  {/* Next Track */}
                  <button
                    type="button"
                    onClick={onNextTrack}
                    aria-label="Следующий трек"
                    className="p-1 text-[#EA9EC6] hover:text-[#701142] hover:scale-110 active:scale-95 transition cursor-pointer"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-[13px] h-[13px] sm:w-[14px] sm:h-[14px] md:w-[clamp(10px,0.95vw,16px)] md:h-[clamp(10px,0.95vw,16px)]"
                    >
                      <path d="M2.5 3.1a.6.6 0 01.94-.5l6.96 4.9a.6.6 0 010 1L3.44 13.4a.6.6 0 01-.94-.5V3.1z" />
                      <rect x="11.7" y="2.5" width="2.3" height="11" rx="0.8" />
                    </svg>
                  </button>

                  {/* Shuffle */}
                  <button
                    type="button"
                    onClick={onToggleShuffle}
                    aria-label="Перемешать треки"
                    aria-pressed={isShuffle}
                    className={`p-1 hover:scale-110 active:scale-95 transition cursor-pointer ${
                      isShuffle ? 'text-[#701142]' : 'text-[#E4A8C7] hover:text-[#701142]'
                    }`}
                  >
                    <Shuffle className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] md:w-[clamp(11px,1.08vw,18px)] md:h-[clamp(11px,1.08vw,18px)] stroke-[2.1]" />
                  </button>
                </div>

                {/* Gorgeous Frosted Sakura Music Player Panel */}
                <AnimatePresence>
                  {playlistOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="fixed inset-x-3 top-20 sm:top-24 mx-auto w-[min(calc(100vw-24px),360px)] max-h-[78dvh] overflow-y-auto md:inset-x-auto md:mx-0 md:top-auto md:absolute md:right-0 md:mt-3 md:w-[356px] md:max-h-[82dvh] rounded-[28px] sm:rounded-[30px] bg-white/95 backdrop-blur-xl border border-[#F7CFE7] p-4 sm:p-5 z-50"
                      style={{
                        boxShadow:
                          '0 0 34px rgba(244, 140, 200, 0.42), 0 18px 44px rgba(210, 120, 175, 0.28), inset 0 1px 2px rgba(255,255,255,0.95)',
                      }}
                    >
                      {/* Now Playing Hero Card */}
                      <div
                        className="rounded-[22px] p-3 sm:p-3.5 mb-3.5 border border-[#F7DCF0]"
                        style={{
                          background: 'linear-gradient(180deg, #FFF7FC 0%, #FCEBF7 100%)',
                        }}
                      >
                        <div className="flex items-center gap-3 sm:gap-3.5">
                          {/* Vinyl Disc Artwork */}
                          <div
                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full shrink-0 flex items-center justify-center relative ${
                              isPlaying ? 'animate-disc-spin' : ''
                            }`}
                            style={{
                              background:
                                'conic-gradient(from 40deg, #FDEAF6, #F59ED2, #FFF1FA, #EC7DBB, #FCE3F3, #F7B7DF, #FDEAF6)',
                              boxShadow:
                                'inset 0 0 0 2px rgba(255,255,255,0.7), 0 4px 14px rgba(230,130,185,0.35)',
                            }}
                          >
                            <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white flex items-center justify-center shadow-inner">
                              <span className="w-2 h-2 rounded-full bg-[#E67BB4]" />
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-medium text-[#B86391] truncate">
                              {currentTrack.mood}
                            </div>
                            <div className="text-[14px] sm:text-[15px] font-semibold text-[#6E1242] truncate leading-snug">
                              {currentTrack.title}
                            </div>
                            <div className="text-xs text-[#9A4270] truncate">
                              {currentTrack.artist}
                            </div>
                          </div>
                        </div>

                        {/* Seek Bar */}
                        <div className="mt-3">
                          <div className="relative h-2 rounded-full bg-white border border-[#F4D2E7] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-[width] duration-150"
                              style={{
                                width: `${progressPct}%`,
                                background: 'linear-gradient(90deg, #FAD0EC 0%, #EA7EB7 100%)',
                              }}
                            />
                            <input
                              type="range"
                              min={0}
                              max={duration || 30}
                              step={0.1}
                              value={currentTime}
                              onChange={(e) => onSeek(parseFloat(e.target.value))}
                              aria-label="Перемотка трека"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#A85382] mt-1 tabular-nums">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration || 30)}</span>
                          </div>
                        </div>

                        {/* Full Transport Row */}
                        <div className="flex items-center justify-between mt-2 pt-1">
                          <button
                            type="button"
                            onClick={onToggleShuffle}
                            aria-label="Перемешать"
                            aria-pressed={isShuffle}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                              isShuffle
                                ? 'bg-[#FCE0F2] text-[#6E1242]'
                                : 'text-[#C27CA2] hover:text-[#6E1242]'
                            }`}
                          >
                            <Shuffle className="w-4 h-4" />
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={onPrevTrack}
                              aria-label="Предыдущий трек"
                              className="w-9 h-9 rounded-full bg-white/90 border border-[#F5D6EA] flex items-center justify-center text-[#701142] hover:bg-[#FCE8F4] transition cursor-pointer"
                            >
                              <SkipBack className="w-4 h-4 fill-current" />
                            </button>

                            <button
                              type="button"
                              onClick={onTogglePlay}
                              aria-label={isPlaying ? 'Пауза' : 'Играть'}
                              className="w-11 h-11 rounded-full flex items-center justify-center text-[#6E1242] border border-[#F3BFE0] shadow-[0_4px_14px_rgba(235,150,198,0.4)] hover:scale-105 active:scale-95 transition cursor-pointer"
                              style={{
                                background: 'linear-gradient(180deg, #FFE4F5 0%, #FACCE9 100%)',
                              }}
                            >
                              {isPlaying ? (
                                <Pause className="w-5 h-5 fill-current" />
                              ) : (
                                <Play className="w-5 h-5 fill-current translate-x-[1px]" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={onNextTrack}
                              aria-label="Следующий трек"
                              className="w-9 h-9 rounded-full bg-white/90 border border-[#F5D6EA] flex items-center justify-center text-[#701142] hover:bg-[#FCE8F4] transition cursor-pointer"
                            >
                              <SkipForward className="w-4 h-4 fill-current" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={onToggleRepeatOne}
                            aria-label="Повтор трека"
                            aria-pressed={isRepeatOne}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                              isRepeatOne
                                ? 'bg-[#FCE0F2] text-[#6E1242]'
                                : 'text-[#C27CA2] hover:text-[#6E1242]'
                            }`}
                          >
                            <Repeat1 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Song Selector (6 Relaxing Tracks) */}
                      <div className="space-y-1 max-h-[210px] overflow-y-auto pr-0.5">
                        {tracks.map((track, idx) => {
                          const active = idx === currentTrackIndex;
                          return (
                            <button
                              key={track.id}
                              type="button"
                              onClick={() => onSelectTrack(idx)}
                              className={`w-full text-left px-3 py-2 rounded-2xl flex items-center gap-3 transition cursor-pointer ${
                                active
                                  ? 'text-[#6E1242] font-semibold'
                                  : 'text-[#781D4E] hover:bg-[#FDF2F9]'
                              }`}
                              style={
                                active
                                  ? {
                                      background:
                                        'linear-gradient(90deg, #FCE3F4 0%, #FDF3FA 100%)',
                                    }
                                  : undefined
                              }
                            >
                              <span
                                className={`w-6 h-6 rounded-full text-[11px] flex items-center justify-center shrink-0 tabular-nums ${
                                  active
                                    ? 'bg-[#EA7EB7] text-white'
                                    : 'bg-[#FDF1F9] text-[#B86391]'
                                }`}
                              >
                                {active && isPlaying ? (
                                  <Music className="w-3.5 h-3.5 animate-pulse" />
                                ) : (
                                  idx + 1
                                )}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="text-[13px] truncate leading-tight">
                                  {track.title}
                                </div>
                                <div className="text-[11px] text-[#A85382] font-normal truncate">
                                  {track.artist} · {track.mood}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Volume Bar */}
                      <div className="flex items-center gap-2.5 pt-3 mt-2.5 border-t border-[#F7E2EF]">
                        <Volume2 className="w-4 h-4 text-[#8D3866] shrink-0" />
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.02}
                          value={volume}
                          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                          aria-label="Громкость музыки"
                          className="w-full accent-[#E47BB7] cursor-pointer"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Favorites Circle Button */}
              <button
                type="button"
                onClick={onOpenFavorites}
                aria-label="Избранное"
                className="relative w-[48px] h-[48px] sm:w-[58px] sm:h-[58px] md:w-[clamp(42px,4.4vw,76px)] md:h-[clamp(42px,4.4vw,76px)] rounded-full bg-white/95 backdrop-blur-md border border-white shadow-[0_6px_22px_rgba(235,160,205,0.34)] flex items-center justify-center text-[#701142] hover:scale-[1.04] active:scale-95 transition cursor-pointer shrink-0"
              >
                <Heart
                  className={`w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] md:w-[clamp(16px,1.6vw,28px)] md:h-[clamp(16px,1.6vw,28px)] stroke-[1.9] ${
                    favoritesCount > 0 ? 'fill-[#F8BBD9]' : ''
                  }`}
                />
                {favoritesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-[20px] px-1 rounded-full bg-[#EA7EB7] text-white text-[10px] sm:text-[11px] font-semibold flex items-center justify-center shadow-sm tabular-nums">
                    {favoritesCount}
                  </span>
                )}
              </button>

              {/* Cart Circle Button */}
              <button
                type="button"
                onClick={onOpenCart}
                aria-label="Корзина"
                className="relative w-[48px] h-[48px] sm:w-[58px] sm:h-[58px] md:w-[clamp(42px,4.4vw,76px)] md:h-[clamp(42px,4.4vw,76px)] rounded-full bg-white/95 backdrop-blur-md border border-white shadow-[0_6px_22px_rgba(235,160,205,0.34)] flex items-center justify-center text-[#701142] hover:scale-[1.04] active:scale-95 transition cursor-pointer shrink-0"
              >
                <ShoppingCart className="w-[20px] h-[20px] sm:w-[24px] sm:h-[24px] md:w-[clamp(16px,1.6vw,28px)] md:h-[clamp(16px,1.6vw,28px)] stroke-[1.9]" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-[20px] px-1 rounded-full bg-[#701142] text-white text-[10px] sm:text-[11px] font-semibold flex items-center justify-center shadow-sm tabular-nums">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>

            {/* Admin Login / Active Admin Pill */}
            {isAdmin ? (
              <div className="inline-flex items-center justify-center flex-wrap gap-1.5 max-w-full">
                <button
                  type="button"
                  onClick={onAdminClick}
                  className="inline-flex items-center gap-2 md:gap-[0.6vw] h-[44px] sm:h-[48px] md:h-[clamp(34px,3.5vw,60px)] px-4 sm:px-5 md:px-[clamp(12px,1.4vw,24px)] rounded-full border border-[#EC9ECF] text-[13px] sm:text-[14px] md:text-[clamp(10.5px,0.96vw,16px)] font-medium text-[#6B0E3F] cursor-pointer whitespace-nowrap shrink-0 hover:brightness-[0.98] transition max-w-full"
                  style={{
                    background: 'linear-gradient(180deg, #FFE2F4 0%, #F9C6E7 100%)',
                    boxShadow:
                      '0 0 22px rgba(244, 138, 198, 0.45), 0 6px 20px rgba(235,160,205,0.32), inset 0 1px 2px rgba(255,255,255,0.9)',
                  }}
                >
                  <ShieldCheck className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px] md:w-[clamp(13px,1.2vw,20px)] md:h-[clamp(13px,1.2vw,20px)] shrink-0" />
                  <span>админ-панель</span>
                </button>
                <button
                  type="button"
                  onClick={onAdminLogout}
                  aria-label="Выйти из режима администратора"
                  title="Выйти из режима администратора"
                  className="w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] md:w-[clamp(34px,3.5vw,60px)] md:h-[clamp(34px,3.5vw,60px)] rounded-full bg-white/95 border border-[#F5CEE6] text-[#9A3162] hover:bg-[#FFF0F6] flex items-center justify-center shadow-[0_6px_18px_rgba(235,160,205,0.28)] cursor-pointer transition shrink-0"
                >
                  <LogOut className="w-[16px] h-[16px] sm:w-[17px] sm:h-[17px] md:w-[clamp(12px,1.15vw,19px)] md:h-[clamp(12px,1.15vw,19px)]" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onAdminClick}
                className="inline-flex items-center justify-center gap-2 sm:gap-2.5 md:gap-[0.7vw] h-[44px] sm:h-[48px] md:h-[clamp(34px,3.5vw,60px)] px-5 sm:px-6 md:px-[clamp(12px,1.6vw,28px)] rounded-full border border-[#F9D6EB] text-[13px] sm:text-[14px] md:text-[clamp(10.5px,0.96vw,16px)] font-normal text-[#701142] cursor-pointer whitespace-nowrap shrink-0 hover:brightness-[0.98] transition max-w-full"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,244,251,0.95) 0%, rgba(253,230,245,0.92) 100%)',
                  boxShadow:
                    '0 6px 20px rgba(235,160,205,0.32), inset 0 1px 2px rgba(255,255,255,0.9)',
                }}
              >
                <svg
                  viewBox="0 0 20 22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="w-[16px] h-[18px] sm:w-[18px] sm:h-[20px] md:w-[clamp(12px,1.2vw,20px)] md:h-[clamp(13px,1.3vw,22px)] shrink-0"
                >
                  <path d="M10 1.8L2.5 5.1v5.6c0 4.65 3.2 8.95 7.5 10.1 4.3-1.15 7.5-5.45 7.5-10.1V5.1L10 1.8z" />
                  <circle cx="10" cy="11" r="1.3" fill="currentColor" stroke="none" />
                </svg>
                <span>войти как администратор</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
