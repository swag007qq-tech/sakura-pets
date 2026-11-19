import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus, Settings, LogOut, ShieldCheck, Package } from 'lucide-react';
import { SakuraBackdrop } from './components/SakuraBackdrop';
import { Header, ActiveTab } from './components/Header';
import { PetCard } from './components/PetCard';
import { Pagination } from './components/Pagination';
import { Preloader } from './components/Preloader';
import { FavoritesDrawer } from './components/FavoritesDrawer';
import { CartDrawer } from './components/CartDrawer';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { AdminProductModal } from './components/AdminProductModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { RELAX_TRACKS } from './data/tracks';
import { CartItem, PetSlot } from './types/store';
import {
  AdminAuthError,
  StorageMode,
  checkAdminSession,
  deleteAdminProduct,
  fetchProducts,
  getStorageMode,
  logoutAdmin,
  subscribeCatalogUpdates,
} from './api/shopApi';

const PLACEHOLDER_SLOTS: PetSlot[] = [1, 2, 3, 4, 5, 6].map((slotNumber) => ({
  id: `slot-${slotNumber}`,
  slotNumber,
  name: '',
  description: '',
  price: null,
  currency: 'грн',
  badges: [],
  stock: 1,
  inStock: true,
  imageUrl: '',
  isPlaceholder: true,
}));

const FAVORITES_KEY = 'sakura_pets_favorites_v2';
const CART_KEY = 'sakura_pets_cart_v2';
const ITEMS_PER_PAGE = 6;

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');

  // Cloud / Server Shared Catalog State
  const [products, setProducts] = useState<PetSlot[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [storageMode, setStorageMode] = useState<StorageMode>(() => getStorageMode());
  const [currentPage, setCurrentPage] = useState(1);

  // Admin Session & Modals State
  const [isAdmin, setIsAdmin] = useState(false);
  const [inactivityTimeoutMs, setInactivityTimeoutMs] = useState(20 * 60 * 1000);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PetSlot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PetSlot | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [detailProduct, setDetailProduct] = useState<PetSlot | null>(null);

  // Favorites & Cart State
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    loadStorage(FAVORITES_KEY, [])
  );
  const [cart, setCart] = useState<CartItem[]>(() => loadStorage(CART_KEY, []));
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // Relaxing Music Player State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeatOne, setIsRepeatOne] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [volume, setVolume] = useState(0.6);
  const [toast, setToast] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const currentTrack = RELAX_TRACKS[currentTrackIndex] ?? RELAX_TRACKS[0];

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  // Sync catalog from shared server/cloud database
  const syncCatalog = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }
    try {
      const data = await fetchProducts();
      setProducts(data.products);
      setStorageMode(data.storageMode);
      setCatalogLoaded(true);
    } catch {
      // Keep current state intact if offline or transient error occurs
    }
  }, []);

  // Initial load + cross-tab / local / optional Supabase sync (works 100% without Express server)
  useEffect(() => {
    void syncCatalog();

    const unsubscribe = subscribeCatalogUpdates(() => {
      void syncCatalog();
    });

    const pollInterval = window.setInterval(() => {
      void syncCatalog();
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncCatalog();
      }
    };
    const handleOnline = () => {
      void syncCatalog();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    return () => {
      unsubscribe();
      window.clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [syncCatalog]);

  // Check existing admin session on mount
  useEffect(() => {
    let active = true;
    checkAdminSession()
      .then((res) => {
        if (!active) return;
        setIsAdmin(res.authenticated);
        setInactivityTimeoutMs(res.inactivityTimeoutMs);
        lastActivityRef.current = Date.now();
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleAdminLogout = useCallback(
    async (reason?: string) => {
      await logoutAdmin().catch(() => undefined);
      setIsAdmin(false);
      setDashboardOpen(false);
      setProductModalOpen(false);
      setDeleteTarget(null);
      setEditingProduct(null);
      showToast(reason || 'Вы вышли из режима администратора');
    },
    [showToast]
  );

  const handleSessionExpired = useCallback(() => {
    void handleAdminLogout('Сессия администратора завершена');
    setLoginModalOpen(true);
  }, [handleAdminLogout]);

  // Automatic inactivity logout when in admin mode
  useEffect(() => {
    if (!isAdmin) return;

    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    for (const ev of events) {
      window.addEventListener(ev, markActivity, { passive: true });
    }

    const idleCheck = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= inactivityTimeoutMs) {
        void handleAdminLogout('Сессия администратора завершена из-за бездействия');
      }
    }, 15000);

    const serverSyncCheck = window.setInterval(() => {
      checkAdminSession()
        .then((res) => {
          if (!res.authenticated) {
            void handleAdminLogout('Сессия администратора истекла');
          }
        })
        .catch(() => undefined);
    }, 60000);

    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, markActivity);
      }
      window.clearInterval(idleCheck);
      window.clearInterval(serverSyncCheck);
    };
  }, [isAdmin, inactivityTimeoutMs, handleAdminLogout]);

  // Music Player Handlers
  const handleNextTrack = useCallback(() => {
    setCurrentTrackIndex((prev) => {
      if (isShuffle && RELAX_TRACKS.length > 1) {
        let next = prev;
        while (next === prev) {
          next = Math.floor(Math.random() * RELAX_TRACKS.length);
        }
        return next;
      }
      return (prev + 1) % RELAX_TRACKS.length;
    });
  }, [isShuffle]);

  const handlePrevTrack = useCallback(() => {
    setCurrentTrackIndex(
      (prev) => (prev - 1 + RELAX_TRACKS.length) % RELAX_TRACKS.length
    );
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.src !== currentTrack.audioUrl) {
      audio.src = currentTrack.audioUrl;
      audio.load();
      setCurrentTime(0);
    }

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setIsPlaying(false);
        });
      }
      showToast(`♪ ${currentTrack.title} — ${currentTrack.artist}`);
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying, showToast]);

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleEnded = () => {
    const audio = audioRef.current;
    if (isRepeatOne && audio) {
      audio.currentTime = 0;
      void audio.play();
      return;
    }
    handleNextTrack();
  };

  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const activeCatalogList = useMemo(() => {
    if (products.length === 0) {
      return isAdmin ? [] : PLACEHOLDER_SLOTS;
    }
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return products.slice(start, start + ITEMS_PER_PAGE);
  }, [products, isAdmin, currentPage]);

  const knownItems = useMemo(() => {
    return products.length > 0 ? products : PLACEHOLDER_SLOTS;
  }, [products]);

  // Keep Favorites & Cart clean when real products are deleted from DB
  useEffect(() => {
    if (!catalogLoaded || products.length === 0) return;
    const validIds = new Set(products.map((p) => p.id));
    setFavoriteIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
    setCart((prev) => {
      const next = prev.filter((item) => validIds.has(item.petId));
      return next.length === prev.length ? prev : next;
    });
  }, [catalogLoaded, products]);

  // Favorites Handlers
  const handleToggleFavorite = (pet: PetSlot) => {
    setFavoriteIds((prev) => {
      const exists = prev.includes(pet.id);
      if (exists) {
        showToast('Убрано из избранного');
        return prev.filter((id) => id !== pet.id);
      }
      showToast(
        pet.name.trim()
          ? `${pet.name} добавлен в избранное`
          : `Карточка #${pet.slotNumber ?? 1} добавлена в избранное`
      );
      return [...prev, pet.id];
    });
  };

  // Cart Handlers
  const handleAddToCart = (pet: PetSlot) => {
    if (!pet.isPlaceholder && (!pet.inStock || pet.stock <= 0)) {
      showToast('Этого товара сейчас нет в наличии');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.petId === pet.id);
      if (existing) {
        return prev.map((item) =>
          item.petId === pet.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { petId: pet.id, quantity: 1 }];
    });
    showToast(
      pet.name.trim()
        ? `${pet.name} добавлен в корзину`
        : `Карточка #${pet.slotNumber ?? 1} добавлена в корзину`
    );
  };

  const handleUpdateCartQty = (petId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.petId === petId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (petId: string) => {
    setCart((prev) => prev.filter((item) => item.petId !== petId));
  };

  // Admin Product Handlers
  const handleProductSaved = (saved: PetSlot, isEdit: boolean) => {
    lastActivityRef.current = Date.now();
    setProducts((prev) => {
      if (isEdit) {
        return prev.map((p) => (p.id === saved.id ? saved : p));
      }
      return prev.some((p) => p.id === saved.id) ? prev : [...prev, saved];
    });
    setProductModalOpen(false);
    setEditingProduct(null);
    showToast(isEdit ? `Изменения сохранены: ${saved.name}` : `Товар добавлен: ${saved.name}`);
  };

  const handleQuickUpdated = (updated: PetSlot) => {
    lastActivityRef.current = Date.now();
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingProduct(true);
    try {
      await deleteAdminProduct(deleteTarget.id);
      lastActivityRef.current = Date.now();
      const deletedId = deleteTarget.id;
      const deletedName = deleteTarget.name;
      setProducts((prev) => prev.filter((p) => p.id !== deletedId));
      setFavoriteIds((prev) => prev.filter((id) => id !== deletedId));
      setCart((prev) => prev.filter((item) => item.petId !== deletedId));
      setDeleteTarget(null);
      showToast(`Товар «${deletedName}» удалён`);
    } catch (err) {
      if (err instanceof AdminAuthError) {
        handleSessionExpired();
        return;
      }
      showToast(err instanceof Error ? err.message : 'Ошибка удаления товара');
    } finally {
      setDeletingProduct(false);
    }
  };

  const favoritePets = knownItems.filter((p) => favoriteIds.includes(p.id));
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-[100dvh] safe-area-shell relative flex flex-col">
      <Preloader />
      <SakuraBackdrop />

      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 30)}
        onEnded={handleEnded}
      />

      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        favoritesCount={favoritePets.length}
        cartCount={cartCount}
        onOpenFavorites={() => setFavoritesOpen(true)}
        onOpenCart={() => setCartOpen(true)}
        tracks={RELAX_TRACKS}
        currentTrackIndex={currentTrackIndex}
        isPlaying={isPlaying}
        isShuffle={isShuffle}
        isRepeatOne={isRepeatOne}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        onTogglePlay={() => setIsPlaying((prev) => !prev)}
        onPrevTrack={() => {
          handlePrevTrack();
          setIsPlaying(true);
        }}
        onNextTrack={() => {
          handleNextTrack();
          setIsPlaying(true);
        }}
        onToggleShuffle={() => {
          setIsShuffle((s) => {
            const next = !s;
            showToast(next ? 'Перемешивание включено' : 'Перемешивание выключено');
            return next;
          });
        }}
        onToggleRepeatOne={() => {
          setIsRepeatOne((r) => {
            const next = !r;
            showToast(next ? 'Повтор трека включён' : 'Повтор трека выключен');
            return next;
          });
        }}
        onSelectTrack={(index) => {
          setCurrentTrackIndex(index);
          setIsPlaying(true);
        }}
        onSeek={handleSeek}
        onVolumeChange={setVolume}
        isAdmin={isAdmin}
        onAdminClick={() => {
          if (isAdmin) {
            setDashboardOpen(true);
          } else {
            setLoginModalOpen(true);
          }
        }}
        onAdminLogout={() => void handleAdminLogout()}
      />

      <main className="w-full max-w-[1580px] mx-auto px-3 sm:px-4 md:px-[clamp(24px,5.8vw,96px)] pb-[max(2rem,env(safe-area-inset-bottom))] flex-1 relative z-10">
        {activeTab === 'catalog' ? (
          <>
            {/* Admin Mode Status & Control Bar (visible ONLY when logged in as admin) */}
            {isAdmin && (
              <div
                className="mb-4 rounded-[26px] bg-white/95 backdrop-blur-md border border-[#F3C8E2] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 max-w-full"
                style={{
                  boxShadow:
                    '0 0 26px rgba(244, 140, 200, 0.28), 0 6px 20px rgba(225, 150, 192, 0.2)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-[#FCE0F2] text-[#701142] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#701142] truncate">
                      Режим администратора
                    </div>
                    <div className="text-[11px] text-[#9A4674] truncate">
                      Товаров в каталоге: {products.length} ·{' '}
                      {storageMode === 'supabase' ? 'Supabase Cloud' : 'Локальное хранилище'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 max-w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(null);
                      setProductModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full text-xs sm:text-sm font-semibold text-[#701142] border border-[#F4C4E3] shadow-sm hover:brightness-[0.98] transition cursor-pointer"
                    style={{
                      background: 'linear-gradient(180deg, #FCE0F2 0%, #FAD0EC 100%)',
                    }}
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Добавить товар</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDashboardOpen(true)}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-full bg-white hover:bg-[#FDF2F9] border border-[#F2CBE3] text-xs sm:text-sm font-medium text-[#701142] transition cursor-pointer"
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    <span>Управление товарами</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleAdminLogout()}
                    className="inline-flex items-center gap-1.5 min-h-[36px] py-1.5 px-3.5 sm:px-4 rounded-full bg-[#FFF2F6] hover:bg-[#FFE2EC] border border-[#F5C5D6] text-xs sm:text-sm font-medium text-[#A42556] transition cursor-pointer max-w-full"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span>Выйти из режима администратора</span>
                  </button>
                </div>
              </div>
            )}

            {/* Empty Admin State when 0 real products exist */}
            {isAdmin && products.length === 0 ? (
              <div className="rounded-[28px] sm:rounded-[34px] bg-white/95 border border-[#F6D5EA] p-6 sm:p-10 text-center shadow-[0_10px_28px_rgba(225,140,190,0.22)]">
                <Package className="w-12 h-12 mx-auto mb-3 text-[#DDA4C5]" />
                <h2 className="text-lg font-semibold text-[#701142]">
                  Каталог пока пуст
                </h2>
                <p className="text-sm text-[#9A4674] mt-1 mb-5 max-w-md mx-auto">
                  Вы вошли как администратор. Добавьте первый настоящий товар, и он сразу
                  появится в каталоге у всех покупателей.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-full text-sm font-semibold text-[#701142] border border-[#F4C4E3] shadow-[0_4px_14px_rgba(235,160,205,0.34)] cursor-pointer"
                  style={{
                    background: 'linear-gradient(180deg, #FCE0F2 0%, #FAD0EC 100%)',
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить товар</span>
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 min-[540px]:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-x-[clamp(14px,2.1vw,34px)] md:gap-y-[clamp(14px,1.5vw,26px)]">
                  {activeCatalogList.map((pet) => (
                    <PetCard
                      key={pet.id}
                      pet={pet}
                      isFavorite={favoriteIds.includes(pet.id)}
                      isAdmin={isAdmin}
                      onToggleFavorite={handleToggleFavorite}
                      onAddToCart={handleAddToCart}
                      onOpenDetail={(item) => setDetailProduct(item)}
                      onEdit={(item) => {
                        setEditingProduct(item);
                        setProductModalOpen(true);
                      }}
                      onDelete={(item) => setDeleteTarget(item)}
                    />
                  ))}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-8 sm:py-16">
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-[28px] sm:rounded-[34px] px-5 sm:px-12 py-6 sm:py-10 bg-white/94 backdrop-blur-md border border-[#F7C6E5] flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-center max-w-full"
              style={{
                boxShadow:
                  '0 0 42px rgba(244, 140, 200, 0.55), 0 12px 32px rgba(230, 155, 198, 0.34), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
              }}
            >
              <span className="text-[17px] sm:text-[23px] font-medium text-[#751748]">
                пруфы и отзывы выдачи -
              </span>

              <a
                href="https://t.me/proofs_milvix"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-[44px] sm:h-[50px] px-6 sm:px-7 rounded-full text-[17px] sm:text-[21px] font-semibold text-[#751748] border border-[#F3BFE0] transition-transform duration-150 hover:scale-[1.04] active:scale-95 whitespace-nowrap"
                style={{
                  background: 'linear-gradient(180deg, #FFE4F5 0%, #FACCE9 100%)',
                  boxShadow:
                    '0 0 22px rgba(244, 138, 198, 0.55), 0 4px 14px rgba(235, 160, 205, 0.36), inset 0 1px 2px rgba(255, 255, 255, 0.85)',
                }}
              >
                тут
              </a>
            </motion.div>
          </div>
        )}
      </main>

      <FavoritesDrawer
        open={favoritesOpen}
        onClose={() => setFavoritesOpen(false)}
        favorites={favoritePets}
        onRemoveFavorite={handleToggleFavorite}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        pets={knownItems}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
      />

      <ProductDetailModal
        product={detailProduct}
        isFavorite={detailProduct ? favoriteIds.includes(detailProduct.id) : false}
        onClose={() => setDetailProduct(null)}
        onToggleFavorite={handleToggleFavorite}
        onAddToCart={handleAddToCart}
      />

      <AdminLoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={(_expiresAt, timeoutMs) => {
          lastActivityRef.current = Date.now();
          setInactivityTimeoutMs(timeoutMs);
          setIsAdmin(true);
          setLoginModalOpen(false);
          setDashboardOpen(true);
          showToast('Вы вошли как администратор');
        }}
      />

      <AdminDashboardModal
        open={dashboardOpen}
        products={products}
        storageMode={storageMode}
        onClose={() => setDashboardOpen(false)}
        onAddProduct={() => {
          setEditingProduct(null);
          setProductModalOpen(true);
        }}
        onEditProduct={(item) => {
          setEditingProduct(item);
          setProductModalOpen(true);
        }}
        onRequestDelete={(item) => setDeleteTarget(item)}
        onProductQuickUpdated={handleQuickUpdated}
        onLogout={() => void handleAdminLogout()}
        onSessionExpired={handleSessionExpired}
        onToast={showToast}
      />

      <AdminProductModal
        open={productModalOpen}
        product={editingProduct}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSaved={handleProductSaved}
        onSessionExpired={handleSessionExpired}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        productName={deleteTarget?.name}
        deleting={deletingProduct}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] max-w-[calc(100vw-2rem)] z-40 px-4 sm:px-5 py-2.5 rounded-full bg-white/95 backdrop-blur-md border border-[#F5CBE6] shadow-[0_8px_26px_rgba(225,140,190,0.34)] text-xs sm:text-sm font-medium text-[#751748] truncate"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
