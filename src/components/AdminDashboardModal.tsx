import React, { useState, useRef } from 'react';
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  LogOut,
  Package,
  Tags,
  Camera,
  ShieldCheck,
  Search,
  Upload,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PetSlot } from '../types/store';
import {
  AdminAuthError,
  StorageMode,
  updateAdminProduct,
  uploadProductPhoto,
} from '../api/shopApi';
import { PetBadgeRow } from './PetBadges';

export type AdminSection = 'products' | 'pricing' | 'photos';

interface AdminDashboardModalProps {
  open: boolean;
  products: PetSlot[];
  storageMode: StorageMode;
  onClose: () => void;
  onAddProduct: () => void;
  onEditProduct: (product: PetSlot) => void;
  onRequestDelete: (product: PetSlot) => void;
  onProductQuickUpdated: (product: PetSlot, expiresAt?: number) => void;
  onLogout: () => void;
  onSessionExpired: () => void;
  onToast: (msg: string) => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  open,
  products,
  storageMode,
  onClose,
  onAddProduct,
  onEditProduct,
  onRequestDelete,
  onProductQuickUpdated,
  onLogout,
  onSessionExpired,
  onToast,
}) => {
  const [section, setSection] = useState<AdminSection>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [currencyDrafts, setCurrencyDrafts] = useState<Record<string, string>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});

  const photoReplaceInputRef = useRef<HTMLInputElement>(null);
  const [photoTargetProduct, setPhotoTargetProduct] = useState<PetSlot | null>(null);

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.badges || []).some((b) => b.toLowerCase().includes(q))
    );
  });

  const handleQuickSavePricing = async (product: PetSlot) => {
    const rawPrice = priceDrafts[product.id] ?? String(product.price ?? 0);
    const rawCurrency = currencyDrafts[product.id] ?? (product.currency || 'грн');
    const rawStock = stockDrafts[product.id] ?? String(product.stock ?? 0);

    const parsedPrice = Number(rawPrice.replace(',', '.'));
    const parsedStock = Number(rawStock);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      onToast('Укажите корректную цену');
      return;
    }
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      onToast('Количество должно быть целым числом >= 0');
      return;
    }

    setSavingId(product.id);
    try {
      const res = await updateAdminProduct(product.id, {
        name: product.name,
        description: product.description,
        price: Math.round(parsedPrice * 100) / 100,
        currency: rawCurrency,
        badges: product.badges ?? [],
        stock: parsedStock,
        inStock: parsedStock > 0 ? product.inStock : false,
        imageUrl: product.imageUrl,
        imagePath: product.imagePath || '',
      });
      onProductQuickUpdated(res.product, res.expiresAt);
      onToast(`Обновлено: ${res.product.name}`);
    } catch (err) {
      if (err instanceof AdminAuthError) {
        onSessionExpired();
        return;
      }
      onToast(err instanceof Error ? err.message : 'Ошибка обновления');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleInStock = async (product: PetSlot) => {
    setSavingId(product.id);
    try {
      const nextInStock = !product.inStock;
      const res = await updateAdminProduct(product.id, {
        name: product.name,
        description: product.description,
        price: product.price ?? 0,
        currency: product.currency || 'грн',
        badges: product.badges ?? [],
        stock: nextInStock && product.stock === 0 ? 1 : product.stock,
        inStock: nextInStock,
        imageUrl: product.imageUrl,
        imagePath: product.imagePath || '',
      });
      onProductQuickUpdated(res.product, res.expiresAt);
      onToast(
        nextInStock
          ? `${res.product.name}: в наличии`
          : `${res.product.name}: нет в наличии`
      );
    } catch (err) {
      if (err instanceof AdminAuthError) {
        onSessionExpired();
        return;
      }
      onToast(err instanceof Error ? err.message : 'Ошибка обновления статуса');
    } finally {
      setSavingId(null);
    }
  };

  const handlePhotoReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const target = photoTargetProduct;
    setPhotoTargetProduct(null);
    if (!file || !target) return;

    setSavingId(target.id);
    try {
      const uploaded = await uploadProductPhoto(file);
      const res = await updateAdminProduct(target.id, {
        name: target.name,
        description: target.description,
        price: target.price ?? 0,
        currency: target.currency || 'грн',
        badges: target.badges ?? [],
        stock: target.stock,
        inStock: target.inStock,
        imageUrl: uploaded.imageUrl,
        imagePath: uploaded.imagePath,
      });
      onProductQuickUpdated(res.product, res.expiresAt);
      onToast(`Фото обновлено для «${res.product.name}»`);
    } catch (err) {
      if (err instanceof AdminAuthError) {
        onSessionExpired();
        return;
      }
      onToast(err instanceof Error ? err.message : 'Ошибка замены фотографии');
    } finally {
      setSavingId(null);
    }
  };

  const handleRemoveProductPhoto = async (product: PetSlot) => {
    if (!product.imageUrl) return;
    setSavingId(product.id);
    try {
      const res = await updateAdminProduct(product.id, {
        name: product.name,
        description: product.description,
        price: product.price ?? 0,
        currency: product.currency || 'грн',
        badges: product.badges ?? [],
        stock: product.stock,
        inStock: product.inStock,
        imageUrl: '',
        imagePath: '',
      });
      onProductQuickUpdated(res.product, res.expiresAt);
      onToast(`Фото удалено у «${res.product.name}»`);
    } catch (err) {
      if (err instanceof AdminAuthError) {
        onSessionExpired();
        return;
      }
      onToast(err instanceof Error ? err.message : 'Ошибка удаления фотографии');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#6E1242]/24 backdrop-blur-[3px]"
          />

          <motion.aside
            aria-label="Панель администратора"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[740px] h-[100dvh] safe-area-drawer bg-[#FFF9FD]/98 backdrop-blur-xl border-l border-white shadow-[0_0_52px_rgba(225,130,185,0.42)] flex flex-col"
          >
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-[#F6DFEE] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[#701142] border border-[#F5CBE6] shrink-0"
                  style={{
                    background: 'linear-gradient(180deg, #FFE8F6 0%, #FAD1EC 100%)',
                  }}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[17px] sm:text-[19px] font-semibold text-[#701142] leading-tight truncate">
                    Панель администратора
                  </h2>
                  <p className="text-xs text-[#9A4674] truncate">
                    Товаров в базе: {products.length} ·{' '}
                    {storageMode === 'supabase' ? 'Supabase Cloud' : 'Локальное хранилище'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={onAddProduct}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full text-xs sm:text-sm font-semibold text-[#701142] border border-[#F4C4E3] shadow-[0_3px_10px_rgba(235,160,205,0.3)] hover:brightness-[0.98] transition cursor-pointer whitespace-nowrap"
                  style={{
                    background: 'linear-gradient(180deg, #FCE0F2 0%, #FAD0EC 100%)',
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить товар</span>
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  title="Выйти из режима администратора"
                  className="inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-full bg-white border border-[#F3D2E6] text-xs font-medium text-[#9A3162] hover:bg-[#FFF0F6] transition cursor-pointer whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Выйти</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Закрыть панель администратора"
                  className="w-9 h-9 rounded-full bg-white border border-[#F5D6E9] flex items-center justify-center text-[#701142] hover:bg-[#FCE8F4] transition cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Section Tabs + Search */}
            <div className="px-4 sm:px-6 py-3 border-b border-[#F8E7F2] bg-white/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSection('products')}
                  className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    section === 'products'
                      ? 'bg-[#FCE0F2] text-[#701142] border border-[#F2C0DF]'
                      : 'bg-white text-[#9A4674] border border-[#F4D9EA] hover:bg-[#FDF3FA]'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Все товары ({products.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSection('pricing')}
                  className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    section === 'pricing'
                      ? 'bg-[#FCE0F2] text-[#701142] border border-[#F2C0DF]'
                      : 'bg-white text-[#9A4674] border border-[#F4D9EA] hover:bg-[#FDF3FA]'
                  }`}
                >
                  <Tags className="w-3.5 h-3.5" />
                  <span>Цены и наличие</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSection('photos')}
                  className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    section === 'photos'
                      ? 'bg-[#FCE0F2] text-[#701142] border border-[#F2C0DF]'
                      : 'bg-white text-[#9A4674] border border-[#F4D9EA] hover:bg-[#FDF3FA]'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Фотографии</span>
                </button>
              </div>

              <div className="relative sm:w-52">
                <Search className="w-3.5 h-3.5 text-[#C07BA2] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск товара..."
                  className="w-full h-9 pl-8 pr-3 rounded-full bg-white border border-[#F2D3E6] text-[16px] sm:text-xs text-[#701142] placeholder:text-[#CFA2BC] focus:outline-none focus:border-[#E27EB6]"
                />
              </div>
            </div>

            <input
              ref={photoReplaceInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              onChange={handlePhotoReplaceFile}
              className="hidden"
            />

            {/* Main List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {filteredProducts.length === 0 ? (
                <div className="rounded-[28px] bg-white border border-[#F8E2F0] p-10 text-center shadow-[0_6px_20px_rgba(225,150,192,0.14)]">
                  <Package className="w-10 h-10 mx-auto mb-3 text-[#E2B5CF]" />
                  <p className="text-[#701142] font-medium">
                    {products.length === 0
                      ? 'В каталоге пока нет товаров'
                      : 'По вашему запросу товары не найдены'}
                  </p>
                  <p className="text-sm text-[#A95A85] mt-1 mb-4">
                    {products.length === 0
                      ? 'Нажмите «Добавить товар», чтобы создать первую карточку в каталоге.'
                      : 'Попробуйте изменить поисковый запрос.'}
                  </p>
                  {products.length === 0 && (
                    <button
                      type="button"
                      onClick={onAddProduct}
                      className="inline-flex items-center gap-2 h-10 px-5 rounded-full text-sm font-semibold text-[#701142] border border-[#F4C4E3] cursor-pointer"
                      style={{
                        background: 'linear-gradient(180deg, #FCE0F2 0%, #FAD0EC 100%)',
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Добавить первый товар</span>
                    </button>
                  )}
                </div>
              ) : section === 'products' ? (
                filteredProducts.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[24px] bg-white border border-[#F5DAE9] p-4 shadow-[0_4px_16px_rgba(225,150,192,0.14)] flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="w-20 h-16 rounded-2xl bg-[#FDF4FA] border border-[#F7E0EE] flex items-center justify-center overflow-hidden shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-[#DAA8C5]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-[#701142] truncate">
                          {item.name}
                        </h3>
                        <PetBadgeRow badges={item.badges} sizeClass="w-5 h-5" />
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            item.inStock && item.stock > 0
                              ? 'bg-[#EEFBF2] text-[#1E6E3B]'
                              : 'bg-[#FFF0F5] text-[#AD2A5A]'
                          }`}
                        >
                          {item.inStock && item.stock > 0
                            ? `в наличии: ${item.stock}`
                            : 'нет в наличии'}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-[#9C5B7F] line-clamp-1 mt-1">
                          {item.description}
                        </p>
                      )}

                      <div className="text-sm font-semibold text-[#701142] tabular-nums mt-1">
                        {item.price !== null
                          ? `${item.price.toLocaleString('ru-RU')} ${item.currency || 'грн'}`
                          : '—'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditProduct(item)}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#FDF2F9] hover:bg-[#FCE0F2] border border-[#F3CFE4] text-xs font-medium text-[#701142] transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Редактировать</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onRequestDelete(item)}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-[#FFF2F6] hover:bg-[#FFE0EA] border border-[#F6C8D9] text-xs font-medium text-[#B3285B] transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Удалить</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : section === 'pricing' ? (
                filteredProducts.map((item) => {
                  const pVal = priceDrafts[item.id] ?? String(item.price ?? 0);
                  const cVal = currencyDrafts[item.id] ?? (item.currency || 'грн');
                  const sVal = stockDrafts[item.id] ?? String(item.stock ?? 0);
                  const busy = savingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="rounded-[24px] bg-white border border-[#F5DAE9] p-4 shadow-[0_4px_16px_rgba(225,150,192,0.14)] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-sm text-[#701142] truncate">
                            {item.name}
                          </span>
                          <PetBadgeRow badges={item.badges} sizeClass="w-5 h-5" />
                        </div>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggleInStock(item)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition shrink-0 ${
                            item.inStock
                              ? 'bg-[#F2FCF5] border-[#BCE6C8] text-[#1E6E3B]'
                              : 'bg-[#FFF2F6] border-[#F6C8D9] text-[#B3285B]'
                          }`}
                        >
                          {item.inStock ? 'В наличии' : 'Нет в наличии'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end">
                        <div>
                          <label className="block text-[11px] text-[#9A4674] mb-1">Цена</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={pVal}
                            onChange={(e) =>
                              setPriceDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            className="w-full h-9 px-3 rounded-xl bg-[#FDF7FB] border border-[#F2CEE4] text-[16px] sm:text-sm text-[#701142] tabular-nums"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#9A4674] mb-1">Валюта</label>
                          <select
                            value={cVal}
                            onChange={(e) =>
                              setCurrencyDrafts((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            className="w-full h-9 px-2.5 rounded-xl bg-[#FDF7FB] border border-[#F2CEE4] text-[16px] sm:text-sm text-[#701142]"
                          >
                            {['грн', '$', '€', '₽'].map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-[#9A4674] mb-1">Остаток</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={sVal}
                            onChange={(e) =>
                              setStockDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            className="w-full h-9 px-3 rounded-xl bg-[#FDF7FB] border border-[#F2CEE4] text-[16px] sm:text-sm text-[#701142] tabular-nums"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleQuickSavePricing(item)}
                          className="h-9 px-3.5 rounded-full text-xs font-semibold text-[#701142] border border-[#F4C4E3] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                          style={{
                            background: 'linear-gradient(180deg, #FCE0F2 0%, #FAD0EC 100%)',
                          }}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{busy ? '...' : 'Применить'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredProducts.map((item) => {
                    const busy = savingId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="rounded-[24px] bg-white border border-[#F5DAE9] p-4 shadow-[0_4px_16px_rgba(225,150,192,0.14)] flex flex-col gap-3"
                      >
                        <div className="h-36 rounded-2xl bg-[#FDF4FA] border border-[#F7E0EE] flex items-center justify-center overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <div className="text-center text-xs text-[#C285A8]">
                              <ImageIcon className="w-7 h-7 mx-auto mb-1 text-[#DAA8C5]" />
                              Нет фото
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-sm text-[#701142] truncate">
                            {item.name}
                          </span>
                          <PetBadgeRow badges={item.badges} sizeClass="w-4 h-4" />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setPhotoTargetProduct(item);
                              photoReplaceInputRef.current?.click();
                            }}
                            className="flex-1 h-9 px-3 rounded-full bg-[#FDF0F8] hover:bg-[#FCE0F2] border border-[#F2CBE3] text-xs font-medium text-[#701142] inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {busy ? 'Загрузка...' : item.imageUrl ? 'Заменить' : 'Загрузить'}
                            </span>
                          </button>

                          {item.imageUrl && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleRemoveProductPhoto(item)}
                              title="Удалить фотографию"
                              className="h-9 px-3 rounded-full bg-[#FFF2F6] hover:bg-[#FFE0EA] border border-[#F6C8D9] text-xs font-medium text-[#B3285B] inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Удалить</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Logout */}
            <div className="px-4 sm:px-6 py-3.5 border-t border-[#F6DFEE] bg-white/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
              <span className="text-xs text-[#9A4674] text-center sm:text-left">
                Сессия автоматически завершается после 20 мин. бездействия
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-[#FFF0F5] hover:bg-[#FFE2EC] border border-[#F5C0D4] text-xs font-semibold text-[#9C2352] transition cursor-pointer shrink-0 max-w-full"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Выйти из режима администратора</span>
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
