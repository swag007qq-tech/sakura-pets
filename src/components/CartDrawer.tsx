import React from 'react';
import { X, ShoppingCart, Plus, Minus, Trash2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CartItem, PetSlot } from '../types/store';
import { PetBadgeRow } from './PetBadges';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  pets: PetSlot[];
  onUpdateQty: (petId: string, delta: number) => void;
  onRemoveItem: (petId: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  cart,
  pets,
  onUpdateQty,
  onRemoveItem,
}) => {
  const resolvedItems = cart
    .map((item) => {
      const pet = pets.find((p) => p.id === item.petId);
      if (!pet) return null;
      return { ...item, pet };
    })
    .filter((entry): entry is CartItem & { pet: PetSlot } => entry !== null);

  const hasAnyPrice = resolvedItems.some((item) => item.pet.price !== null);
  const totalsByCurrency = new Map<string, number>();
  for (const item of resolvedItems) {
    if (item.pet.price !== null) {
      const curr = item.pet.currency || 'грн';
      totalsByCurrency.set(
        curr,
        (totalsByCurrency.get(curr) ?? 0) + item.pet.price * item.quantity
      );
    }
  }
  const formattedTotal = hasAnyPrice
    ? Array.from(totalsByCurrency.entries())
        .map(([curr, sum]) => `${sum.toLocaleString('ru-RU')} ${curr}`)
        .join(' + ')
    : '— грн';

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
            aria-label="Корзина"
            className="relative z-10 w-full max-w-md h-[100dvh] safe-area-drawer bg-[#FFF9FD]/96 backdrop-blur-xl border-l border-white shadow-[0_0_44px_rgba(225,130,185,0.35)] flex flex-col"
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[#F6DFEE] shrink-0">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5 text-[#701142]" />
                <h2 className="text-[20px] font-medium text-[#701142]">корзина</h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть корзину"
                className="w-10 h-10 rounded-full bg-white border border-[#F5D6E9] flex items-center justify-center text-[#701142] hover:bg-[#FCE8F4] transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {resolvedItems.length === 0 ? (
                <div className="rounded-[28px] bg-white border border-[#F8E2F0] p-6 sm:p-8 text-center shadow-[0_6px_20px_rgba(225,150,192,0.16)]">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-[#E2B5CF]" />
                  <p className="text-[#8F3B68] font-medium">Корзина пока пуста</p>
                  <p className="text-sm text-[#BA739B] mt-1">
                    Нажмите «в корзину» на любой карточке, чтобы добавить её
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {resolvedItems.map(({ pet, quantity }) => {
                      const curr = pet.currency || 'грн';
                      return (
                        <div
                          key={pet.id}
                          className="rounded-[24px] sm:rounded-[26px] bg-white border border-[#F8E2F0] shadow-[0_6px_20px_rgba(225,150,192,0.18)] p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5"
                        >
                          <div className="w-12 h-12 sm:w-16 sm:h-14 rounded-2xl bg-[#FDF4FA] border border-[#F7E0EE] flex items-center justify-center overflow-hidden shrink-0">
                            {pet.imageUrl ? (
                              <img
                                src={pet.imageUrl}
                                alt={pet.name || `Карточка #${pet.slotNumber ?? 1}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <ShoppingCart className="w-4 h-4 text-[#D780B0]" />
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
                                ? `${(pet.price * quantity).toLocaleString('ru-RU')} ${curr}`
                                : '— грн'}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(pet.id, -1)}
                              aria-label="Уменьшить количество"
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FDF3F9] text-[#701142] hover:bg-[#FCE0F2] flex items-center justify-center cursor-pointer transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-5 sm:w-6 text-center text-xs sm:text-sm font-medium text-[#701142] tabular-nums">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQty(pet.id, 1)}
                              aria-label="Увеличить количество"
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FDF3F9] text-[#701142] hover:bg-[#FCE0F2] flex items-center justify-center cursor-pointer transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveItem(pet.id)}
                              aria-label="Удалить из корзины"
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[#B86391] hover:bg-[#FCE0F2] hover:text-[#701142] flex items-center justify-center cursor-pointer ml-0.5 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-[26px] sm:rounded-[28px] bg-white border border-[#F8E2F0] p-4 sm:p-5 space-y-4 shadow-[0_6px_20px_rgba(225,150,192,0.16)]">
                    <div className="flex items-center justify-between gap-2 text-base font-semibold text-[#701142] pb-3 border-b border-[#F7E5F0]">
                      <span>сумма:</span>
                      <span className="tabular-nums text-right">{formattedTotal}</span>
                    </div>

                    <p className="text-[13px] leading-relaxed text-[#9A4674] text-center">
                      нажмите на кнопку купить, чтобы оплатить и договориться о выдаче покупки
                    </p>

                    <a
                      href="https://t.me/m1lv1x_exe"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-11 rounded-full text-[15px] font-medium text-[#701142] border border-[#F4C4E3] shadow-[0_4px_14px_rgba(235,160,205,0.34)] hover:brightness-[0.98] active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
                      style={{
                        background: 'linear-gradient(180deg, #FCE0F2 0%, #FAD0EC 100%)',
                      }}
                    >
                      <Send className="w-4 h-4" />
                      <span>купить</span>
                    </a>
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
