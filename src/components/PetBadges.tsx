import React from 'react';
import { PetBadgeId } from '../types/store';

export interface BadgeConfig {
  id: PetBadgeId;
  label: string;
  title: string;
  src: string;
  isSquare?: boolean;
  imgWidthPct: number;
  imgLeftPct: number;
  imgTopPct: number;
}

export const PET_BADGES: BadgeConfig[] = [
  {
    id: 'F',
    label: 'F',
    title: 'Fly (летающий)',
    src: '/assets/aistudio/0d9f33642bba385841cc986e510e9c6f_42624f06.jpg',
    imgWidthPct: 203.3,
    imgLeftPct: -46.7,
    imgTopPct: -47.1,
  },
  {
    id: 'R',
    label: 'R',
    title: 'Ride (ездовой)',
    src: '/assets/aistudio/0c62440b648c5cb38b22efa5b95f9aa2_57dfd5ef.jpg',
    imgWidthPct: 203.8,
    imgLeftPct: -47.1,
    imgTopPct: -47.5,
  },
  {
    id: 'N',
    label: 'N',
    title: 'Neon (неон)',
    src: '/assets/aistudio/cdc44daa1f51157faf2dab9f0752a1cf_5af3c6dc.jpg',
    imgWidthPct: 204.4,
    imgLeftPct: -47.2,
    imgTopPct: -48.0,
  },
  {
    id: 'M',
    label: 'M',
    title: 'Mega (мега-неон)',
    src: '/assets/aistudio/d2db29c472026812b4cfb14b90b2c275_811816c7.jpg',
    isSquare: true,
    imgWidthPct: 194.7,
    imgLeftPct: -43.4,
    imgTopPct: -42.5,
  },
];

const BADGE_MAP = new Map<PetBadgeId, BadgeConfig>(
  PET_BADGES.map((badge) => [badge.id, badge])
);

const BADGE_ORDER: PetBadgeId[] = ['M', 'N', 'F', 'R'];

export function sortBadges(badges: PetBadgeId[]): PetBadgeId[] {
  const unique = Array.from(new Set(badges));
  return unique.sort((a, b) => BADGE_ORDER.indexOf(a) - BADGE_ORDER.indexOf(b));
}

interface PetBadgeIconProps {
  badgeId: PetBadgeId;
  sizeClass?: string;
}

export const PetBadgeIcon: React.FC<PetBadgeIconProps> = ({
  badgeId,
  sizeClass = 'w-6 h-6',
}) => {
  const cfg = BADGE_MAP.get(badgeId);
  if (!cfg) return null;

  return (
    <span
      title={cfg.title}
      className={`relative inline-block overflow-hidden shrink-0 shadow-[0_2px_6px_rgba(120,30,80,0.18)] ${
        cfg.isSquare ? 'rounded-[22%]' : 'rounded-full'
      } ${sizeClass}`}
    >
      <img
        src={cfg.src}
        alt={cfg.label}
        draggable={false}
        className="absolute max-w-none pointer-events-none select-none"
        style={{
          width: `${cfg.imgWidthPct}%`,
          height: `${cfg.imgWidthPct}%`,
          left: `${cfg.imgLeftPct}%`,
          top: `${cfg.imgTopPct}%`,
        }}
      />
    </span>
  );
};

interface PetBadgeRowProps {
  badges?: PetBadgeId[];
  sizeClass?: string;
  className?: string;
}

export const PetBadgeRow: React.FC<PetBadgeRowProps> = ({
  badges,
  sizeClass = 'w-6 h-6',
  className = '',
}) => {
  if (!badges || badges.length === 0) return null;
  const ordered = sortBadges(badges);

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {ordered.map((id) => (
        <PetBadgeIcon key={id} badgeId={id} sizeClass={sizeClass} />
      ))}
    </div>
  );
};
