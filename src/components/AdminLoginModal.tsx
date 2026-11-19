import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, ShieldCheck, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loginAdmin } from '../api/shopApi';

interface AdminLoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (expiresAt: number, inactivityTimeoutMs: number) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setShowPassword(false);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = password.trim();
    if (!cleanPassword) {
      setError('Введите пароль администратора');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const session = await loginAdmin(cleanPassword);
      onSuccess(session.expiresAt, session.inactivityTimeoutMs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный пароль администратора');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#6E1242]/24 backdrop-blur-[3px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-login-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[400px] max-h-[92dvh] overflow-y-auto rounded-[28px] sm:rounded-[32px] bg-[#FFF9FD]/96 backdrop-blur-xl border border-white p-5 sm:p-7"
            style={{
              boxShadow:
                '0 0 46px rgba(235, 145, 198, 0.48), 0 18px 44px rgba(170, 80, 130, 0.22)',
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[#701142] border border-[#F5CBE6] shrink-0"
                  style={{
                    background: 'linear-gradient(180deg, #FFE8F6 0%, #FAD1EC 100%)',
                  }}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2
                  id="admin-login-title"
                  className="text-[18px] sm:text-[19px] font-semibold text-[#701142] leading-tight"
                >
                  Вход администратора
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть окно входа"
                className="w-9 h-9 rounded-full bg-white border border-[#F5D6E9] flex items-center justify-center text-[#701142] hover:bg-[#FCE8F4] transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-password-input"
                  className="block text-xs font-medium text-[#9A4674] mb-1.5"
                >
                  Пароль администратора
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#C47BA3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={inputRef}
                    id="admin-password-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Введите пароль"
                    className="w-full h-11 pl-10 pr-11 rounded-2xl bg-white border border-[#F2CEE4] text-[16px] sm:text-[15px] text-[#701142] placeholder:text-[#CFA1BA] focus:outline-none focus:border-[#E27EB6] shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-[#A85382] hover:bg-[#FCE8F4] hover:text-[#701142] transition cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-2xl bg-[#FFF0F5] border border-[#F5B8CE] px-3.5 py-2.5 text-[13px] font-medium text-[#A91E52]"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-full text-[15px] font-semibold text-[#701142] border border-[#F4C4E3] shadow-[0_4px_14px_rgba(235,160,205,0.34)] hover:brightness-[0.98] active:scale-[0.99] disabled:opacity-60 transition cursor-pointer"
                style={{
                  background: 'linear-gradient(180deg, #FCE0F2 0%, #FAD0EC 100%)',
                }}
              >
                {submitting ? 'Проверка...' : 'Войти'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
