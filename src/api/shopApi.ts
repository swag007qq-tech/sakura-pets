import { PetSlot, ProductPayload } from '../types/store';

const TOKEN_STORAGE_KEY = 'sakura_admin_token_v1';

export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

export function getStoredAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore sessionStorage restrictions
  }
}

function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  const token = getStoredAdminToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseJsonSafe(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function fetchProducts(): Promise<{
  products: PetSlot[];
  storageMode: 'supabase' | 'server-db';
}> {
  const res = await fetch('/api/products', {
    cache: 'no-store',
    credentials: 'include',
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Не удалось загрузить каталог'
    );
  }
  return {
    products: Array.isArray(data.products) ? (data.products as PetSlot[]) : [],
    storageMode: data.storageMode === 'supabase' ? 'supabase' : 'server-db',
  };
}

export async function checkAdminSession(): Promise<{
  authenticated: boolean;
  expiresAt?: number;
  inactivityTimeoutMs: number;
}> {
  const res = await fetch('/api/admin/session', {
    headers: buildAuthHeaders(),
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await parseJsonSafe(res);
  const authenticated = Boolean(data.authenticated);
  if (!authenticated) {
    setStoredAdminToken(null);
  }
  return {
    authenticated,
    expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : undefined,
    inactivityTimeoutMs:
      typeof data.inactivityTimeoutMs === 'number'
        ? data.inactivityTimeoutMs
        : 20 * 60 * 1000,
  };
}

export async function loginAdmin(password: string): Promise<{
  expiresAt: number;
  inactivityTimeoutMs: number;
}> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Неверный пароль администратора'
    );
  }
  if (typeof data.token === 'string') {
    setStoredAdminToken(data.token);
  }
  return {
    expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : Date.now() + 20 * 60 * 1000,
    inactivityTimeoutMs:
      typeof data.inactivityTimeoutMs === 'number'
        ? data.inactivityTimeoutMs
        : 20 * 60 * 1000,
  };
}

export async function logoutAdmin(): Promise<void> {
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: buildAuthHeaders(),
      credentials: 'include',
    });
  } finally {
    setStoredAdminToken(null);
  }
}

export async function uploadProductPhoto(file: File): Promise<{
  imageUrl: string;
  imagePath: string;
  expiresAt?: number;
}> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: buildAuthHeaders(),
    credentials: 'include',
    body: formData,
  });

  const data = await parseJsonSafe(res);
  if (res.status === 401) {
    setStoredAdminToken(null);
    throw new AdminAuthError(
      typeof data.error === 'string' ? data.error : 'Сессия администратора истекла'
    );
  }
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Не удалось загрузить фотографию'
    );
  }

  return {
    imageUrl: String(data.imageUrl || ''),
    imagePath: String(data.imagePath || ''),
    expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : undefined,
  };
}

export async function deleteUploadedPhoto(imagePath: string): Promise<void> {
  if (!imagePath) return;
  const res = await fetch('/api/admin/upload', {
    method: 'DELETE',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ imagePath }),
  });
  if (res.status === 401) {
    setStoredAdminToken(null);
    throw new AdminAuthError('Сессия администратора истекла');
  }
}

export async function createAdminProduct(
  payload: ProductPayload
): Promise<{ product: PetSlot; expiresAt?: number }> {
  const res = await fetch('/api/admin/products', {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (res.status === 401) {
    setStoredAdminToken(null);
    throw new AdminAuthError(
      typeof data.error === 'string' ? data.error : 'Сессия администратора истекла'
    );
  }
  if (!res.ok || !data.product) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Не удалось сохранить товар'
    );
  }
  return {
    product: data.product as PetSlot,
    expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : undefined,
  };
}

export async function updateAdminProduct(
  id: string,
  payload: ProductPayload
): Promise<{ product: PetSlot; expiresAt?: number }> {
  const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (res.status === 401) {
    setStoredAdminToken(null);
    throw new AdminAuthError(
      typeof data.error === 'string' ? data.error : 'Сессия администратора истекла'
    );
  }
  if (!res.ok || !data.product) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Не удалось обновить товар'
    );
  }
  return {
    product: data.product as PetSlot,
    expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : undefined,
  };
}

export async function deleteAdminProduct(id: string): Promise<{ expiresAt?: number }> {
  const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(),
    credentials: 'include',
  });
  const data = await parseJsonSafe(res);
  if (res.status === 401) {
    setStoredAdminToken(null);
    throw new AdminAuthError(
      typeof data.error === 'string' ? data.error : 'Сессия администратора истекла'
    );
  }
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Не удалось удалить товар'
    );
  }
  return {
    expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : undefined,
  };
}
