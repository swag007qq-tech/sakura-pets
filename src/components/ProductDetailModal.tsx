import React from 'react';
import { X, Heart, ShoppingCart, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PetSlot } from '../types/store';
import { PetBadgeRow } from './PetBadges';

interface ProductDetailModalProps {
  product: PetSlot | null;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: (pet: PetSlot) => void;
  onAddToCart: (pet: PetSlot) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isFavorite,
  onClose,
  onToggleFavorite,
  onAddToCart,
}) => {
  const available = product ? product.inStock && product.stock > 0 : false;

  return (
    <AnimatePresence>
      {product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#6E1242]/22 backdrop-blur-[3px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[460px] max-h-[92dvh] overflow-y-auto rounded-[28px] sm:rounded-[34px] bg-[#FFF9FD] border border-white p-4 sm:p-6 shadow-[0_0_46px_rgba(225,130,185,0.42)]"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть карточку товара"
              className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-10 w-9 h-9 rounded-full bg-white border border-[#F5D6E9] flex items-center justify-center text-[#701142] hover:bg-[#FCE8F4] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative h-44 sm:h-56 rounded-[24px] sm:rounded-[26px] bg-white border border-[#F6DFEE] flex items-center justify-center overflow-hidden mb-4">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <ImageIcon className="w-12 h-12 text-[#E2B5CF]" />
              )}

              {product.badges && product.badges.length > 0 && (
                <div className="absolute bottom-3 left-3.5">
                  <PetBadgeRow badges={product.badges} sizeClass="w-7 h-7" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  available
                    ? 'bg-[#EEFBF2] text-[#1E6E3B]'
                    : 'bg-[#FFF0F5] text-[#AD2A5A]'
                }`}
              >
                {available ? `в наличии: ${product.stock} шт.` : 'нет в наличии'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-[20px] sm:text-[22px] font-semibold text-[#701142] leading-snug break-words">
                {product.name}
              </h3>
              <PetBadgeRow badges={product.badges} sizeClass="w-6 h-6" />
            </div>

            {product.description && (
              <p className="text-sm leading-relaxed text-[#8E436C] mt-2 whitespace-pre-line break-words">
                {product.description}
              </p>
            )}

            <div className="mt-5 pt-4 border-t border-[#F6DFEE] flex items-center justify-between flex-wrap gap-3">
              <div className="text-[19px] sm:text-[20px] font-semibold text-[#701142] tabular-nums">
                {product.price !== null
                  ? `${product.price.toLocaleString('ru-RU')} ${product.currency || 'грн'}`
                  : '— грн'}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => onToggleFavorite(product)}
                  aria-label="Избранное"
                  className="w-11 h-11 rounded-full bg-white border border-[#F3D2E6] flex items-center justify-center text-[#C8629B] hover:scale-105 transition cursor-pointer shrink-0"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isFavorite ? 'fill-[#EE7FB8] text-[#C8629B]' : ''
                    }`}
                  />
                </button>

                <button
                  type="button"
                  disabled={!available}
                  onClick={() => {
                    onAddToCart(product);
                    onClose();
                  }}
                  className="h-11 px-4 sm:px-5 rounded-full text-sm font-semibold text-[#701142] border border-[#F4C4E3] inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
                  style={{
                    background: 'linear-gradient(180deg, #FCE0F2 0%, #FAD0EC 100%)',
                  }}
                >
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  <span>{available ? 'в корзину' : 'нет в наличии'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
