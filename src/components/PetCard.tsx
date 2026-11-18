import React from 'react';
import { Heart, ShoppingCart, Pencil, Trash2 } from 'lucide-react';
import { PetSlot } from '../types/store';
import { PetBadgeRow } from './PetBadges';

interface PetCardProps {
  pet: PetSlot;
  isFavorite: boolean;
  isAdmin?: boolean;
  onToggleFavorite: (pet: PetSlot) => void;
  onAddToCart: (pet: PetSlot) => void;
  onOpenDetail?: (pet: PetSlot) => void;
  onEdit?: (pet: PetSlot) => void;
  onDelete?: (pet: PetSlot) => void;
}

export const PetCard: React.FC<PetCardProps> = ({
  pet,
  isFavorite,
  isAdmin = false,
  onToggleFavorite,
  onAddToCart,
  onOpenDetail,
  onEdit,
  onDelete,
}) => {
  const isReal = !pet.isPlaceholder;
  const available = isReal ? pet.inStock && pet.stock > 0 : true;
  const currencyLabel = pet.currency || 'грн';

  return (
    <article className="rounded-[28px] md:rounded-[clamp(20px,2.05vw,34px)] bg-white border border-[#F8D8EC] shadow-[0_10px_28px_rgba(225,140,190,0.28)] overflow-hidden flex flex-col">
      {/* Upper White Photo Area */}
      <div className="relative h-[156px] sm:h-[168px] md:h-[clamp(108px,11.2vw,188px)] bg-white flex items-center justify-center overflow-hidden">
        {/* Top-left admin quick controls or out-of-stock pill */}
        {isAdmin && isReal ? (
          <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 md:top-[clamp(8px,0.9vw,14px)] md:left-[clamp(10px,1vw,16px)] z-10 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit?.(pet)}
              aria-label={`Редактировать ${pet.name}`}
              title="Редактировать"
              className="h-8 px-2.5 rounded-full bg-[#FFF7FC]/95 border border-[#F2CBE3] text-[#701142] hover:bg-[#FCE0F2] text-xs font-medium inline-flex items-center gap-1 shadow-sm transition cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Редактировать</span>
            </button>

            <button
              type="button"
              onClick={() => onDelete?.(pet)}
              aria-label={`Удалить ${pet.name}`}
              title="Удалить"
              className="w-8 h-8 rounded-full bg-[#FFF3F7]/95 border border-[#F5C5D6] text-[#B9255C] hover:bg-[#FFE0EA] inline-flex items-center justify-center shadow-sm transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          isReal &&
          !available && (
            <span className="absolute top-2.5 left-3 sm:top-3 sm:left-3.5 z-10 px-2.5 py-0.5 rounded-full bg-[#FFF0F5]/95 border border-[#F5C8D8] text-[11px] font-medium text-[#A92B59]">
              нет в наличии
            </span>
          )
        )}

        <button
          type="button"
          onClick={() => onToggleFavorite(pet)}
          aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          aria-pressed={isFavorite}
          className="absolute top-3 right-3 sm:top-3.5 sm:right-4 md:top-[clamp(8px,0.95vw,16px)] md:right-[clamp(10px,1.1vw,18px)] z-10 w-9 h-9 md:w-[clamp(24px,2.3vw,40px)] md:h-[clamp(24px,2.3vw,40px)] rounded-full flex items-center justify-center text-[#C8629B] hover:scale-110 active:scale-95 transition cursor-pointer"
        >
          <Heart
            className={`w-[22px] h-[22px] sm:w-[24px] sm:h-[24px] md:w-[clamp(16px,1.65vw,27px)] md:h-[clamp(16px,1.65vw,27px)] stroke-[1.85] transition-colors ${
              isFavorite ? 'fill-[#EE7FB8] text-[#C8629B]' : 'fill-transparent text-[#C8629B]'
            }`}
          />
        </button>

        {isReal ? (
          <button
            type="button"
            onClick={() => onOpenDetail?.(pet)}
            aria-label={`Подробнее о ${pet.name}`}
            className="w-full h-full flex items-center justify-center cursor-pointer focus:outline-none"
          >
            {pet.imageUrl ? (
              <img
                src={pet.imageUrl}
                alt={pet.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-3 transition-transform duration-200 hover:scale-[1.03]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-[#D8A3C1]">
                <Heart className="w-7 h-7 fill-[#FDE7F4] text-[#DDA8C7]" />
              </div>
            )}
          </button>
        ) : (
          pet.imageUrl && (
            <img
              src={pet.imageUrl}
              alt={pet.name || `Питомец #${pet.slotNumber ?? 1}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-3"
            />
          )
        )}

        {/* Selected Pet Trait Badges (F, R, N, M) displayed right next to the pet */}
        {isReal && pet.badges && pet.badges.length > 0 && (
          <div className="absolute bottom-2.5 left-3 sm:left-3.5 md:bottom-[clamp(6px,0.7vw,12px)] md:left-[clamp(10px,1vw,16px)] z-10 pointer-events-none">
            <PetBadgeRow
              badges={pet.badges}
              sizeClass="w-[21px] h-[21px] sm:w-[22px] sm:h-[22px] md:w-[clamp(18px,1.55vw,26px)] md:h-[clamp(18px,1.55vw,26px)]"
            />
          </div>
        )}
      </div>

      {/* Bottom Rounded Blush Capsule Strip */}
      <div
        className="h-[58px] sm:h-[64px] md:h-[clamp(42px,4.55vw,76px)] px-3 sm:px-4 md:px-[clamp(10px,1.2vw,20px)] rounded-t-[22px] sm:rounded-t-[24px] md:rounded-t-[clamp(18px,1.8vw,30px)] rounded-b-[28px] md:rounded-b-[clamp(20px,2.05vw,34px)] flex items-center justify-between gap-1.5 sm:gap-2"
        style={{
          background: 'linear-gradient(180deg, #FDF2FA 0%, #FCEBF7 100%)',
        }}
      >
        <div
          onClick={isReal ? () => onOpenDetail?.(pet) : undefined}
          className={`flex items-center min-w-0 flex-1 ${isReal ? 'cursor-pointer' : ''}`}
        >
          <div
            className={
              pet.name.trim()
                ? 'flex-1 min-w-0 pl-0.5 pr-1.5 sm:pl-1 sm:pr-2'
                : 'w-[clamp(34px,13vw,68px)] md:w-[clamp(36px,5.2vw,88px)] flex justify-center shrink-0'
            }
          >
            <span className="text-[13.5px] sm:text-[15px] md:text-[clamp(10.5px,1vw,17px)] font-normal text-[#A14678] truncate block">
              {pet.name.trim() ? pet.name : '—'}
            </span>
          </div>

          <span
            className="w-px h-5 md:h-[clamp(14px,1.4vw,24px)] bg-[#E7C6DC] shrink-0"
            aria-hidden="true"
          />

          <div className="flex-1 min-w-0 flex justify-center px-1 sm:px-1.5 md:px-2">
            <span className="text-[13.5px] sm:text-[15px] md:text-[clamp(10.5px,1vw,17px)] font-normal text-[#8B3263] whitespace-nowrap truncate tabular-nums">
              {pet.price !== null
                ? `${pet.price.toLocaleString('ru-RU')} ${currencyLabel}`
                : '— грн'}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={!available}
          onClick={() => onAddToCart(pet)}
          className="inline-flex items-center justify-center gap-1.5 sm:gap-2 md:gap-[0.55vw] h-[38px] sm:h-[42px] md:h-[clamp(28px,3vw,50px)] px-3 sm:px-4 md:px-[clamp(9px,1.35vw,24px)] rounded-full text-[13.5px] sm:text-[15px] md:text-[clamp(10.5px,1vw,17px)] font-normal text-[#7B144A] whitespace-nowrap shrink-0 cursor-pointer hover:brightness-[0.98] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-150"
          style={{
            background: 'linear-gradient(180deg, #FCE0F2 0%, #FAD0EC 100%)',
            boxShadow:
              '0 2px 10px rgba(235,165,205,0.28), inset 0 1px 2px rgba(255,255,255,0.7)',
          }}
        >
          <ShoppingCart className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] md:w-[clamp(12px,1.2vw,20px)] md:h-[clamp(12px,1.2vw,20px)] stroke-[1.9] text-[#7B144A] shrink-0" />
          <span>{available ? 'в корзину' : 'нет'}</span>
        </button>
      </div>
    </article>
  );
};
