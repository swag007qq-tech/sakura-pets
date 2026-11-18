import React from 'react';
import { X, Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PetSlot } from '../types/store';
import { PetBadgeRow } from './PetBadges';

interface FavoritesDrawerProps {
  open: boolean;
  onClose: () => void;
  favorites: PetSlot[];
  onRemoveFavorite: (pet: PetSlot) => void;
  onAddToCart: (pet: PetSlot) => void;
}

export const FavoritesDrawer: React.FC<FavoritesDrawerProps> = ({
  open,
  onClose,
  favorites,
  onRemoveFavorite,
  onAddToCart,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#6E1242]/20 backdrop-blur-[2px]"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            aria-label="Избранное"
            className="relative z-10 w-full max-w-md h-[100dvh] safe-area-drawer bg-[#FFF9FD]/96 backdrop-blur-xl border-l border-white shadow-[0_0_44px_rgba(225,130,185,0.35)] flex flex-col"
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[#F6DFEE] shrink-0">
              <div className="flex items-center gap-2.5">
                <Heart className="w-5 h-5 fill-[#EE7FB8] text-[#C8629B]" />
                <h2 className="text-[20px] font-medium text-[#701142]">избранное</h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть избранное"
                className="w-10 h-10 rounded-full bg-white border border-[#F5D6E9] flex items-center justify-center text-[#701142] hover:bg-[#FCE8F4] transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {favorites.length === 0 ? (
                <div className="rounded-[28px] bg-white border border-[#F8E2F0] p-6 sm:p-8 text-center shadow-[0_6px_20px_rgba(225,150,192,0.16)]">
                  <Heart className="w-10 h-10 mx-auto mb-3 text-[#E2B5CF]" />
                  <p className="text-[#8F3B68] font-medium">В избранном пока пусто</p>
                  <p className="text-sm text-[#BA739B] mt-1">
                    Нажмите на сердечко на карточке, чтобы сохранить её сюда
                  </p>
                </div>
              ) : (
                favorites.map((pet) => (
                  <div
                    key={pet.id}
                    className="rounded-[24px] sm:rounded-[26px] bg-white border border-[#F8E2F0] shadow-[0_6px_20px_rgba(225,150,192,0.18)] p-3 sm:p-4 flex items-center gap-2.5 sm:gap-4"
                  >
                    <div className="w-14 h-12 sm:w-20 sm:h-16 rounded-2xl bg-[#FDF4FA] border border-[#F7E0EE] flex items-center justify-center overflow-hidden shrink-0">
                      {pet.imageUrl ? (
                        <img
                          src={pet.imageUrl}
                          alt={pet.name || `Карточка #${pet.slotNumber}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <Heart className="w-5 h-5 fill-[#F8C8E2] text-[#D780B0]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-sm sm:text-base text-[#701142] truncate">
                          {pet.name.trim() ? pet.name : `Карточка #${pet.slotNumber ?? 1}`}
                        </span>
                        <PetBadgeRow badges={pet.badges} sizeClass="w-4 h-4" />
                      </div>
                      <div className="text-xs sm:text-sm text-[#9A4674] tabular-nums mt-0.5 truncate">
                        {pet.price !== null
                          ? `${pet.price.toLocaleString('ru-RU')} ${pet.currency || 'грн'}`
                          : '— грн'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAddToCart(pet)}
                        aria-label="Добавить в корзину"
                        title="В корзину"
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#701142] border border-[#F4C4E3] cursor-pointer hover:scale-105 active:scale-95 transition"
                        style={{
                          background: 'linear-gradient(180deg, #FCE0F2 0%, #FAD0EC 100%)',
                        }}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onRemoveFavorite(pet)}
                        aria-label="Удалить из избранного"
                        title="Удалить из избранного"
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FDF3F9] text-[#A85382] hover:bg-[#FCE0F2] hover:text-[#701142] flex items-center justify-center transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
