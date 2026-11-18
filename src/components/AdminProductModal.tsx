import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PetBadgeId, PetSlot, ProductPayload } from '../types/store';
import {
  AdminAuthError,
  createAdminProduct,
  deleteUploadedPhoto,
  updateAdminProduct,
  uploadProductPhoto,
} from '../api/shopApi';
import { PET_BADGES, PetBadgeIcon, sortBadges } from './PetBadges';

interface AdminProductModalProps {
  open: boolean;
  product: PetSlot | null; // null = create mode, non-null = edit existing
  onClose: () => void;
  onSaved: (product: PetSlot, isEdit: boolean, expiresAt?: number) => void;
  onSessionExpired: () => void;
}

const CURRENCY_OPTIONS = ['грн', '$', '€', '₽'];

export const AdminProductModal: React.FC<AdminProductModalProps> = ({
  open,
  product,
  onClose,
  onSaved,
  onSessionExpired,
}) => {
  const isEdit = Boolean(product);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('грн');
  const [badges, setBadges] = useState<PetBadgeId[]>([]);
  const [stock, setStock] = useState('1');
  const [inStock, setInStock] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempUploadedPaths, setTempUploadedPaths] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setName(product.name);
      setDescription(product.description);
      setPrice(product.price !== null ? String(product.price) : '');
      setCurrency(product.currency || 'грн');
      setBadges(Array.isArray(product.badges) ? sortBadges(product.badges) : []);
      setStock(String(product.stock ?? 1));
      setInStock(product.inStock ?? true);
      setImageUrl(product.imageUrl || '');
      setImagePath(product.imagePath || '');
    } else {
      setName('');
      setDescription('');
      setPrice('');
      setCurrency('грн');
      setBadges([]);
      setStock('1');
      setInStock(true);
      setImageUrl('');
      setImagePath('');
    }
    setTempUploadedPaths([]);
    setError(null);
    setUploading(false);
    setSaving(false);
  }, [open, product]);

  const handleClose = async () => {
    if (saving || uploading) return;
    for (const p of tempUploadedPaths) {
      if (p !== product?.imagePath) {
        await deleteUploadedPhoto(p).catch(() => undefined);
      }
    }
    onClose();
  };

  const toggleBadge = (id: PetBadgeId) => {
    setBadges((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      return sortBadges(next);
    });
    if (error) setError(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите файл изображения (JPG, PNG, WEBP, GIF)');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Размер фотографии не должен превышать 8 МБ');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const result = await uploadProductPhoto(file);
      if (imagePath && tempUploadedPaths.includes(imagePath) && imagePath !== product?.imagePath) {
        await deleteUploadedPhoto(imagePath).catch(() => undefined);
      }
      setImageUrl(result.imageUrl);
      setImagePath(result.imagePath);
      setTempUploadedPaths((prev) => [...prev, result.imagePath]);
    } catch (err) {
      if (err instanceof AdminAuthError) {
        onSessionExpired();
        return;
      }
      setError(err instanceof Error ? err.message : 'Ошибка загрузки фотографии');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (imagePath && tempUploadedPaths.includes(imagePath) && imagePath !== product?.imagePath) {
      await deleteUploadedPhoto(imagePath).catch(() => undefined);
    }
    setImageUrl('');
    setImagePath('');
  };

  const handleStockChange = (val: string) => {
    setStock(val);
    const num = Number(val);
    if (Number.isInteger(num) && num <= 0) {
      setInStock(false);
    } else if (Number.isInteger(num) && num > 0) {
      setInStock(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const parsedPrice = Number(price.replace(',', '.'));
    const parsedStock = stock === '' ? 0 : Number(stock);

    if (!trimmedName) {
      setError('Введите название товара');
      return;
    }
    if (price.trim() === '' || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Укажите корректную цену (число не меньше 0)');
      return;
    }
    if (badges.length === 0) {
      setError('Обязательно выберите хотя бы один значок (F, R, N или M)');
      return;
    }
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setError('Количество в наличии должно быть целым числом (>= 0)');
      return;
    }

    const payload: ProductPayload = {
      name: trimmedName,
      description: description.trim(),
      price: Math.round(parsedPrice * 100) / 100,
      currency: currency.trim() || 'грн',
      badges,
      stock: parsedStock,
      inStock,
      imageUrl,
      imagePath,
    };

    setSaving(true);
    try {
      const response =
        isEdit && product
          ? await updateAdminProduct(product.id, payload)
          : await createAdminProduct(payload);

      for (const p of tempUploadedPaths) {
        if (p !== imagePath && p !== product?.imagePath) {
          await deleteUploadedPhoto(p).catch(() => undefined);
        }
      }

      onSaved(response.product, isEdit, response.expiresAt);
    } catch (err) {
      if (err instanceof AdminAuthError) {
        onSessionExpired();
        return;
      }
      setError(err instanceof Error ? err.message : 'Не удалось сохранить товар');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-[#6E1242]/26 backdrop-blur-[3px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-product-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[560px] max-h-[92dvh] rounded-[28px] sm:rounded-[32px] bg-[#FFF9FD] border border-white shadow-[0_0_46px_rgba(225,130,185,0.45)] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-4 border-b border-[#F6DFEE] shrink-0">
              <h2
                id="admin-product-modal-title"
                className="text-[18px] sm:text-[19px] font-semibold text-[#701142] truncate"
              >
                {isEdit ? 'Редактировать товар' : 'Добавить товар'}
              </h2>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Закрыть форму товара"
                className="w-9 h-9 rounded-full bg-white border border-[#F5D6E9] flex items-center justify-center text-[#701142] hover:bg-[#FCE8F4] transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-medium text-[#9A4674] mb-1.5">
                  Фотография товара (загрузка с устройства)
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-[24px] bg-white border border-[#F3D5E8]">
                  <div className="w-28 h-24 rounded-2xl bg-[#FDF4FA] border border-[#F6E0EE] flex items-center justify-center overflow-hidden shrink-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={name || 'Предпросмотр'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-1.5"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-[#DCA7C6]" />
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-2 w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-[#FDF0F8] hover:bg-[#FCE0F2] border border-[#F2CBE3] text-sm font-medium text-[#701142] transition cursor-pointer disabled:opacity-60"
                    >
                      <Upload className="w-4 h-4" />
                      <span>
                        {uploading
                          ? 'Загрузка фото...'
                          : imageUrl
                            ? 'Заменить фотографию'
                            : 'Выбрать фото с устройства'}
                      </span>
                    </button>

                    {imageUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={uploading}
                        className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-[#B33968] hover:bg-[#FFF0F5] transition cursor-pointer self-start"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Удалить фотографию</span>
                      </button>
                    )}

                    <p className="text-[11px] text-[#B8769A]">
                      JPG, PNG, WEBP, GIF до 8 МБ. Фото сохраняется в облаке/на сервере.
                    </p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label
                  htmlFor="product-name-input"
                  className="block text-xs font-medium text-[#9A4674] mb-1"
                >
                  Название товара <span className="text-[#D93A73]">*</span>
                </label>
                <input
                  id="product-name-input"
                  type="text"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Sakura Fox"
                  className="w-full h-10 px-3.5 rounded-2xl bg-white border border-[#F2CEE4] text-[16px] sm:text-sm text-[#701142] focus:outline-none focus:border-[#E27EB6]"
                />
              </div>

              {/* Mandatory Pet Badges Selector (F, R, N, M) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="block text-xs font-medium text-[#9A4674]">
                    Значки (обязательно выберите один или несколько){' '}
                    <span className="text-[#D93A73]">*</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PET_BADGES.map((badge) => {
                    const selected = badges.includes(badge.id);
                    return (
                      <button
                        key={badge.id}
                        type="button"
                        onClick={() => toggleBadge(badge.id)}
                        aria-pressed={selected}
                        className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition cursor-pointer ${
                          selected
                            ? 'bg-[#FCE4F3] border-[#E38CC0] shadow-[0_4px_12px_rgba(235,145,198,0.28)]'
                            : 'bg-white border-[#F2CEE4] hover:bg-[#FDF4FA]'
                        }`}
                      >
                        <PetBadgeIcon badgeId={badge.id} sizeClass="w-8 h-8" />
                        <div className="text-left min-w-0 flex-1">
                          <div className="text-sm font-semibold text-[#701142] leading-none">
                            {badge.label}
                          </div>
                          <div className="text-[10px] text-[#9A4674] truncate mt-0.5">
                            {badge.id === 'F'
                              ? 'Fly'
                              : badge.id === 'R'
                                ? 'Ride'
                                : badge.id === 'N'
                                  ? 'Neon'
                                  : 'Mega'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price + Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="product-price-input"
                    className="block text-xs font-medium text-[#9A4674] mb-1"
                  >
                    Цена <span className="text-[#D93A73]">*</span>
                  </label>
                  <input
                    id="product-price-input"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full h-10 px-3.5 rounded-2xl bg-white border border-[#F2CEE4] text-[16px] sm:text-sm text-[#701142] tabular-nums focus:outline-none focus:border-[#E27EB6]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="product-currency-select"
                    className="block text-xs font-medium text-[#9A4674] mb-1"
                  >
                    Валюта
                  </label>
                  <select
                    id="product-currency-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-2xl bg-white border border-[#F2CEE4] text-[16px] sm:text-sm text-[#701142] focus:outline-none focus:border-[#E27EB6]"
                  >
                    {CURRENCY_OPTIONS.map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stock & In-Stock status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label
                    htmlFor="product-stock-input"
                    className="block text-xs font-medium text-[#9A4674] mb-1"
                  >
                    Количество в наличии
                  </label>
                  <input
                    id="product-stock-input"
                    type="number"
                    min="0"
                    step="1"
                    value={stock}
                    onChange={(e) => handleStockChange(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-2xl bg-white border border-[#F2CEE4] text-[16px] sm:text-sm text-[#701142] tabular-nums focus:outline-none focus:border-[#E27EB6]"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setInStock((prev) => !prev)}
                    aria-pressed={inStock}
                    className={`w-full h-10 px-4 rounded-2xl border flex items-center justify-between text-sm font-medium transition cursor-pointer ${
                      inStock
                        ? 'bg-[#F5FDF7] border-[#BCE6C8] text-[#1F6A3B]'
                        : 'bg-[#FFF3F7] border-[#F4C4D5] text-[#A22E58]'
                    }`}
                  >
                    <span>{inStock ? 'В наличии' : 'Нет в наличии'}</span>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        inStock ? 'bg-[#31A25A] text-white' : 'bg-[#D95C88] text-white'
                      }`}
                    >
                      {inStock ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="product-desc-input"
                  className="block text-xs font-medium text-[#9A4674] mb-1"
                >
                  Описание
                </label>
                <textarea
                  id="product-desc-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Подробности о товаре..."
                  className="w-full p-3.5 rounded-2xl bg-white border border-[#F2CEE4] text-[16px] sm:text-sm text-[#701142] focus:outline-none focus:border-[#E27EB6] resize-none"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-2xl bg-[#FFF0F5] border border-[#F5B8CE] px-3.5 py-2.5 text-[13px] font-medium text-[#A91E52]"
                >
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={saving || uploading}
                  className="flex-1 h-11 rounded-full bg-white border border-[#F0CFE3] text-sm font-medium text-[#701142] hover:bg-[#FDF2F9] transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-[1.5] h-11 rounded-full text-[15px] font-semibold text-[#701142] border border-[#F4C4E3] shadow-[0_4px_14px_rgba(235,160,205,0.34)] hover:brightness-[0.98] disabled:opacity-60 transition cursor-pointer"
                  style={{
                    background: 'linear-gradient(180deg, #FCE0F2 0%, #FAD0EC 100%)',
                  }}
                >
                  {saving ? 'Сохранение...' : 'Сохранить товар'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
