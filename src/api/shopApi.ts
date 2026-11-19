import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PetBadgeId, PetSlot, ProductPayload } from '../types/store';

// Hardcoded admin password directly in frontend code (no env vars, works on static Vercel)
const ADMIN_PASSWORD = 'Sakura72918';
const SESSION_STORAGE_KEY = 'sakura_admin_session_v1';
const PRODUCTS_STORAGE_KEY = 'sakura_pets_catalog_v1';
const CATALOG_EVENT_NAME = 'sakura:catalog-updated';
const BROADCAST_CHANNEL_NAME = 'sakura_pets_catalog_bc';
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000;
const VALID_BADGES: PetBadgeId[] = ['F', 'R', 'N', 'M'];

export type StorageMode = 'supabase' | 'local-storage';

export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

interface StoredAdminSession {
  token: string;
  expiresAt: number;
}

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const supabaseBucket =
  (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'product-images').trim() ||
  'product-images';

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseClient;
}

function getStorageMode(): StorageMode {
  return getSupabase() ? 'supabase' : 'local-storage';
}

function readStoredSession(): StoredAdminSession | null {
  try {
    const raw =
      localStorage.getItem(SESSION_STORAGE_KEY) ||
      sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAdminSession>;
    if (typeof parsed.token !== 'string' || typeof parsed.expiresAt !== 'number') {
      return null;
    }
    return { token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredAdminSession | null): void {
  try {
    if (session) {
      const serialized = JSON.stringify(session);
      localStorage.setItem(SESSION_STORAGE_KEY, serialized);
      sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage restriction errors
  }
}

function touchAdminSession(): number {
  const existing = readStoredSession();
  const now = Date.now();
  if (!existing || existing.expiresAt <= now) {
    writeStoredSession(null);
    throw new AdminAuthError('Сессия администратора истекла');
  }
  const expiresAt = now + INACTIVITY_TIMEOUT_MS;
  writeStoredSession({ token: existing.token, expiresAt });
  return expiresAt;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeBadges(badges: unknown): PetBadgeId[] {
  if (!Array.isArray(badges)) return [];
  const filtered = badges.filter(
    (b): b is PetBadgeId => typeof b === 'string' && VALID_BADGES.includes(b as PetBadgeId)
  );
  return VALID_BADGES.filter((id) => filtered.includes(id));
}

function normalizeProductsList(items: PetSlot[]): PetSlot[] {
  return items.map((item, idx) => ({
    ...item,
    slotNumber: idx + 1,
    badges: normalizeBadges(item.badges),
    currency: item.currency || 'грн',
    stock: Number.isFinite(Number(item.stock)) ? Math.max(0, Math.trunc(Number(item.stock))) : 0,
    inStock: Boolean(item.inStock),
    imageUrl: item.imageUrl || '',
    imagePath: item.imagePath || '',
    isPlaceholder: false,
  }));
}

function readLocalProducts(): PetSlot[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeProductsList(parsed as PetSlot[]);
  } catch {
    return [];
  }
}

function writeLocalProducts(items: PetSlot[]): PetSlot[] {
  const normalized = normalizeProductsList(items);
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    throw new Error(
      'Недостаточно памяти браузера (localStorage) для сохранения. Удалите старые товары или загрузите фото меньшего размера.'
    );
  }
  notifyCatalogUpdated();
  return normalized;
}

function notifyCatalogUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CATALOG_EVENT_NAME));
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type: 'updated', at: Date.now() });
      channel.close();
    }
  } catch {
    // Ignore BroadcastChannel errors
  }
}

export function subscribeCatalogUpdates(onUpdate: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = () => onUpdate();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === PRODUCTS_STORAGE_KEY) {
      onUpdate();
    }
  };

  window.addEventListener(CATALOG_EVENT_NAME, handleCustom);
  window.addEventListener('storage', handleStorage);

  let channel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = () => onUpdate();
    }
  } catch {
    channel = null;
  }

  return () => {
    window.removeEventListener(CATALOG_EVENT_NAME, handleCustom);
    window.removeEventListener('storage', handleStorage);
    channel?.close();
  };
}

function mapSupabaseRow(row: Record<string, unknown>, index: number): PetSlot {
  return {
    id: String(row.id ?? ''),
    slotNumber: index + 1,
    name: String(row.name ?? ''),
    description: String(row.description ?? ''),
    price: row.price === null || row.price === undefined ? 0 : Number(row.price),
    currency: String(row.currency ?? 'грн'),
    badges: normalizeBadges(row.badges),
    stock: Number(row.stock ?? 0),
    inStock: Boolean(row.in_stock ?? true),
    imageUrl: String(row.image_url ?? ''),
    imagePath: String(row.image_path ?? ''),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    isPlaceholder: false,
  };
}

export async function fetchProducts(): Promise<{
  products: PetSlot[];
  storageMode: StorageMode;
}> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      return {
        products: data.map((row, idx) =>
          mapSupabaseRow(row as Record<string, unknown>, idx)
        ),
        storageMode: 'supabase',
      };
    }
  }

  return {
    products: readLocalProducts(),
    storageMode: 'local-storage',
  };
}

export async function checkAdminSession(): Promise<{
  authenticated: boolean;
  expiresAt?: number;
  inactivityTimeoutMs: number;
}> {
  const stored = readStoredSession();
  const now = Date.now();
  if (!stored || stored.expiresAt <= now) {
    writeStoredSession(null);
    return {
      authenticated: false,
      inactivityTimeoutMs: INACTIVITY_TIMEOUT_MS,
    };
  }

  const nextExpires = now + INACTIVITY_TIMEOUT_MS;
  writeStoredSession({ token: stored.token, expiresAt: nextExpires });
  return {
    authenticated: true,
    expiresAt: nextExpires,
    inactivityTimeoutMs: INACTIVITY_TIMEOUT_MS,
  };
}

export async function loginAdmin(password: string): Promise<{
  expiresAt: number;
  inactivityTimeoutMs: number;
}> {
  const cleanPassword = password.trim();
  if (cleanPassword !== ADMIN_PASSWORD) {
    throw new Error('Неверный пароль администратора');
  }

  const expiresAt = Date.now() + INACTIVITY_TIMEOUT_MS;
  writeStoredSession({
    token: createId(),
    expiresAt,
  });

  return {
    expiresAt,
    inactivityTimeoutMs: INACTIVITY_TIMEOUT_MS,
  };
}

export async function logoutAdmin(): Promise<void> {
  writeStoredSession(null);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Не удалось прочитать файл изображения'));
      }
    };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл изображения'));
    reader.readAsDataURL(file);
  });
}

async function compressImageToDataUrl(file: File): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file);
  if (typeof document === 'undefined' || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return rawDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxSide = 720;
        let { width, height } = img;
        if (width <= 0 || height <= 0) {
          resolve(rawDataUrl);
          return;
        }
        if (width > maxSide || height > maxSide) {
          const ratio = Math.min(maxSide / width, maxSide / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const webpUrl = canvas.toDataURL('image/webp', 0.86);
        if (webpUrl.startsWith('data:image/webp')) {
          resolve(webpUrl.length < rawDataUrl.length ? webpUrl : rawDataUrl);
          return;
        }

        const pngUrl = canvas.toDataURL('image/png');
        resolve(pngUrl.length < rawDataUrl.length ? pngUrl : rawDataUrl);
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export async function uploadProductPhoto(file: File): Promise<{
  imageUrl: string;
  imagePath: string;
  expiresAt?: number;
}> {
  const expiresAt = touchAdminSession();
  const supabase = getSupabase();

  if (supabase) {
    const ext = (file.name.split('.').pop() || 'png').replace(/[^a-z0-9]/gi, '') || 'png';
    const filePath = `products/${Date.now()}-${createId()}.${ext}`;
    const { error } = await supabase.storage.from(supabaseBucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/png',
    });
    if (!error) {
      const { data } = supabase.storage.from(supabaseBucket).getPublicUrl(filePath);
      if (data?.publicUrl) {
        return {
          imageUrl: data.publicUrl,
          imagePath: filePath,
          expiresAt,
        };
      }
    }
  }

  const imageUrl = await compressImageToDataUrl(file);
  return {
    imageUrl,
    imagePath: '',
    expiresAt,
  };
}

export async function deleteUploadedPhoto(imagePath: string): Promise<void> {
  if (!imagePath) return;
  const supabase = getSupabase();
  if (supabase && !imagePath.startsWith('data:')) {
    await supabase.storage.from(supabaseBucket).remove([imagePath]).catch(() => undefined);
  }
}

export async function createAdminProduct(
  payload: ProductPayload
): Promise<{ product: PetSlot; expiresAt?: number }> {
  const expiresAt = touchAdminSession();
  const nowIso = new Date().toISOString();
  const newId = createId();

  const cleanBadges = normalizeBadges(payload.badges);

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        id: newId,
        name: payload.name.trim(),
        description: payload.description.trim(),
        price: payload.price,
        currency: payload.currency || 'грн',
        badges: cleanBadges,
        stock: payload.stock,
        in_stock: payload.inStock,
        image_url: payload.imageUrl || '',
        image_path: payload.imagePath || '',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Не удалось сохранить товар в Supabase');
    }

    const { products } = await fetchProducts();
    const index = products.findIndex((p) => p.id === newId);
    const created =
      index >= 0
        ? products[index]
        : mapSupabaseRow(data as Record<string, unknown>, products.length);
    notifyCatalogUpdated();
    return { product: created, expiresAt };
  }

  const existing = readLocalProducts();
  const created: PetSlot = {
    id: newId,
    slotNumber: existing.length + 1,
    name: payload.name.trim(),
    description: payload.description.trim(),
    price: payload.price,
    currency: payload.currency || 'грн',
    badges: cleanBadges,
    stock: payload.stock,
    inStock: payload.inStock,
    imageUrl: payload.imageUrl || '',
    imagePath: payload.imagePath || '',
    createdAt: nowIso,
    updatedAt: nowIso,
    isPlaceholder: false,
  };

  const next = writeLocalProducts([...existing, created]);
  return {
    product: next[next.length - 1] ?? created,
    expiresAt,
  };
}

export async function updateAdminProduct(
  id: string,
  payload: ProductPayload
): Promise<{ product: PetSlot; expiresAt?: number }> {
  const expiresAt = touchAdminSession();
  const nowIso = new Date().toISOString();

  const cleanBadges = normalizeBadges(payload.badges);

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .update({
        name: payload.name.trim(),
        description: payload.description.trim(),
        price: payload.price,
        currency: payload.currency || 'грн',
        badges: cleanBadges,
        stock: payload.stock,
        in_stock: payload.inStock,
        image_url: payload.imageUrl || '',
        image_path: payload.imagePath || '',
        updated_at: nowIso,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Не удалось обновить товар в Supabase');
    }

    const { products } = await fetchProducts();
    const found = products.find((p) => p.id === id);
    notifyCatalogUpdated();
    return {
      product: found ?? mapSupabaseRow(data as Record<string, unknown>, 0),
      expiresAt,
    };
  }

  const existing = readLocalProducts();
  const targetIndex = existing.findIndex((item) => item.id === id);
  if (targetIndex < 0) {
    throw new Error('Товар не найден');
  }

  const updatedItem: PetSlot = {
    ...existing[targetIndex],
    name: payload.name.trim(),
    description: payload.description.trim(),
    price: payload.price,
    currency: payload.currency || 'грн',
    badges: cleanBadges,
    stock: payload.stock,
    inStock: payload.inStock,
    imageUrl: payload.imageUrl || '',
    imagePath: payload.imagePath || '',
    updatedAt: nowIso,
    isPlaceholder: false,
  };

  const nextList = existing.map((item) => (item.id === id ? updatedItem : item));
  const saved = writeLocalProducts(nextList);
  return {
    product: saved.find((p) => p.id === id) ?? updatedItem,
    expiresAt,
  };
}

export async function deleteAdminProduct(id: string): Promise<{ expiresAt?: number }> {
  const expiresAt = touchAdminSession();
  const supabase = getSupabase();

  if (supabase) {
    const { data: existing } = await supabase
      .from('products')
      .select('image_path')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      throw new Error(error.message || 'Не удалось удалить товар');
    }

    const imagePath = typeof existing?.image_path === 'string' ? existing.image_path : '';
    if (imagePath) {
      await deleteUploadedPhoto(imagePath);
    }

    notifyCatalogUpdated();
    return { expiresAt };
  }

  const existing = readLocalProducts();
  const nextList = existing.filter((item) => item.id !== id);
  writeLocalProducts(nextList);
  return { expiresAt };
}

export { getStorageMode };
