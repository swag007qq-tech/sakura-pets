import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDeleteModalProps {
  open: boolean;
  productName?: string;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  open,
  productName,
  deleting = false,
  onCancel,
  onConfirm,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={deleting ? undefined : onCancel}
            className="fixed inset-0 bg-[#6E1242]/28 backdrop-blur-[3px]"
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[420px] max-h-[92dvh] overflow-y-auto rounded-[28px] sm:rounded-[30px] bg-[#FFF9FD] border border-white p-5 sm:p-6 shadow-[0_0_46px_rgba(225,120,175,0.45)]"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFEAF1] border border-[#F8C2D6] flex items-center justify-center text-[#B9255C] shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3
                  id="confirm-delete-title"
                  className="text-[17px] font-semibold text-[#701142] leading-snug"
                >
                  Удаление товара
                </h3>
              </div>

              <button
                type="button"
                onClick={onCancel}
                disabled={deleting}
                aria-label="Отменить удаление"
                className="w-8 h-8 rounded-full bg-white border border-[#F5D6E9] flex items-center justify-center text-[#701142] hover:bg-[#FCE8F4] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {productName && (
              <div className="mb-3 px-3.5 py-2 rounded-2xl bg-[#FDF2F9] border border-[#F6D7EB] text-sm font-medium text-[#701142] truncate">
                {productName}
              </div>
            )}

            <p className="text-[14.5px] leading-relaxed text-[#7F2958] mb-5">
              Вы действительно хотите удалить этот товар? Это действие нельзя отменить.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                disabled={deleting}
                className="flex-1 h-10 rounded-full bg-white border border-[#F0CFE3] text-sm font-medium text-[#701142] hover:bg-[#FDF2F9] transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={deleting}
                className="flex-1 h-10 rounded-full bg-[#D93A73] hover:bg-[#C32D63] text-white text-sm font-semibold shadow-[0_4px_14px_rgba(217,58,115,0.3)] disabled:opacity-60 transition cursor-pointer"
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
