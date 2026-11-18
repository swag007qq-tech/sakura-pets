import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

export type PetBadgeId = 'F' | 'R' | 'N' | 'M';

export interface ProductRecord {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  badges: PetBadgeId[];
  stock: number;
  inStock: boolean;
  imageUrl: string;
  imagePath: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  currency: string;
  badges: PetBadgeId[];
  stock: number;
  inStock: boolean;
  imageUrl: string;
  imagePath: string;
}

function resolveWritableDataDir(): string {
  const preferred = path.resolve(process.cwd(), 'data');
  try {
    fs.mkdirSync(path.join(preferred, 'uploads'), { recursive: true });
    fs.accessSync(preferred, fs.constants.W_OK);
    fs.accessSync(path.join(preferred, 'uploads'), fs.constants.W_OK);
    const dbFile = path.join(preferred, 'sakura.db');
    if (fs.existsSync(dbFile)) {
      fs.accessSync(dbFile, fs.constants.W_OK);
    }
    return preferred;
  } catch {
    const fallback = path.join(os.tmpdir(), 'sakura-pets-data');
    fs.mkdirSync(path.join(fallback, 'uploads'), { recursive: true });
    return fallback;
  }
}

const DATA_DIR = resolveWritableDataDir();
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'sakura.db');

export const sqlite = new DatabaseSync(DB_PATH);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'грн',
    category TEXT NOT NULL DEFAULT '',
    badges TEXT NOT NULL DEFAULT '[]',
    stock INTEGER NOT NULL DEFAULT 1,
    in_stock INTEGER NOT NULL DEFAULT 1,
    image_url TEXT NOT NULL DEFAULT '',
    image_path TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Safe migration if products table was created earlier without badges column
const tableCols = sqlite
  .prepare('PRAGMA table_info(products)')
  .all() as unknown as Array<{ name: string }>;
if (!tableCols.some((c) => c.name === 'badges')) {
  sqlite.exec("ALTER TABLE products ADD COLUMN badges TEXT NOT NULL DEFAULT '[]';");
}

const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'product-images';

const supabase: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export function getStorageMode(): 'supabase' | 'server-db' {
  return supabase ? 'supabase' : 'server-db';
}

const VALID_BADGES = new Set<PetBadgeId>(['F', 'R', 'N', 'M']);

function parseBadgesValue(raw: unknown): PetBadgeId[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }
  const out: PetBadgeId[] = [];
  for (const item of list) {
    if (typeof item === 'string' && VALID_BADGES.has(item as PetBadgeId)) {
      const id = item as PetBadgeId;
      if (!out.includes(id)) out.push(id);
    }
  }
  return out;
}

interface SqliteProductRow {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  badges?: string;
  stock: number;
  in_stock: number;
  image_url: string;
  image_path: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseProductRow {
  id: string;
  name: string;
  description: string;
  price: number | string;
  currency: string;
  badges?: PetBadgeId[] | string;
  stock: number;
  in_stock: boolean;
  image_url: string;
  image_path: string;
  created_at: string;
  updated_at: string;
}

function mapSqliteRow(row: SqliteProductRow): ProductRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    price: Number(row.price),
    currency: row.currency || 'грн',
    badges: parseBadgesValue(row.badges),
    stock: Number(row.stock),
    inStock: Boolean(row.in_stock),
    imageUrl: row.image_url ?? '',
    imagePath: row.image_path ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSupabaseRow(row: SupabaseProductRow): ProductRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    price: Number(row.price),
    currency: row.currency || 'грн',
    badges: parseBadgesValue(row.badges),
    stock: Number(row.stock),
    inStock: Boolean(row.in_stock),
    imageUrl: row.image_url ?? '',
    imagePath: row.image_path ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

export async function uploadProductImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ imageUrl: string; imagePath: string }> {
  const ext = MIME_EXTENSIONS[mimeType.toLowerCase()] || '.png';
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

  if (supabase) {
    const objectPath = `products/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from(supabaseBucket)
      .upload(objectPath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Ошибка загрузки в Supabase Storage: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(supabaseBucket).getPublicUrl(objectPath);
    return {
      imageUrl: data.publicUrl,
      imagePath: objectPath,
    };
  }

  const dest = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(dest, buffer);
  return {
    imageUrl: `/uploads/${fileName}`,
    imagePath: fileName,
  };
}

export async function deleteStoredImage(imagePath: string): Promise<void> {
  if (!imagePath) return;

  if (supabase) {
    await supabase.storage.from(supabaseBucket).remove([imagePath]).catch(() => undefined);
    return;
  }

  const safeName = path.basename(imagePath);
  const fullPath = path.join(UPLOADS_DIR, safeName);
  if (fullPath.startsWith(UPLOADS_DIR) && fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

export async function listProducts(): Promise<ProductRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Ошибка чтения базы данных: ${error.message}`);
    }
    return ((data || []) as SupabaseProductRow[]).map(mapSupabaseRow);
  }

  const rows = sqlite
    .prepare('SELECT * FROM products ORDER BY created_at ASC')
    .all() as unknown as SqliteProductRow[];
  return rows.map(mapSqliteRow);
}

export async function getProductById(id: string): Promise<ProductRecord | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Ошибка чтения товара: ${error.message}`);
    }
    return data ? mapSupabaseRow(data as SupabaseProductRow) : null;
  }

  const row = sqlite
    .prepare('SELECT * FROM products WHERE id = ?')
    .get(id) as unknown as SqliteProductRow | undefined;
  return row ? mapSqliteRow(row) : null;
}

export async function createProduct(input: ProductInput): Promise<ProductRecord> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        id,
        name: input.name,
        description: input.description,
        price: input.price,
        currency: input.currency,
        badges: input.badges,
        stock: input.stock,
        in_stock: input.inStock,
        image_url: input.imageUrl,
        image_path: input.imagePath,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Ошибка сохранения товара: ${error?.message || 'Unknown error'}`);
    }
    return mapSupabaseRow(data as SupabaseProductRow);
  }

  sqlite
    .prepare(
      `INSERT INTO products (id, name, description, price, currency, category, badges, stock, in_stock, image_url, image_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.name,
      input.description,
      input.price,
      input.currency,
      '',
      JSON.stringify(input.badges),
      input.stock,
      input.inStock ? 1 : 0,
      input.imageUrl,
      input.imagePath,
      now,
      now
    );

  const created = await getProductById(id);
  if (!created) {
    throw new Error('Не удалось прочитать созданный товар');
  }
  return created;
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<ProductRecord | null> {
  const existing = await getProductById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const imageChanged = existing.imagePath && existing.imagePath !== input.imagePath;

  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .update({
        name: input.name,
        description: input.description,
        price: input.price,
        currency: input.currency,
        badges: input.badges,
        stock: input.stock,
        in_stock: input.inStock,
        image_url: input.imageUrl,
        image_path: input.imagePath,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Ошибка обновления товара: ${error.message}`);
    }

    if (imageChanged) {
      await deleteStoredImage(existing.imagePath);
    }

    return data ? mapSupabaseRow(data as SupabaseProductRow) : null;
  }

  sqlite
    .prepare(
      `UPDATE products
       SET name = ?, description = ?, price = ?, currency = ?, badges = ?, stock = ?, in_stock = ?, image_url = ?, image_path = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(
      input.name,
      input.description,
      input.price,
      input.currency,
      JSON.stringify(input.badges),
      input.stock,
      input.inStock ? 1 : 0,
      input.imageUrl,
      input.imagePath,
      now,
      id
    );

  if (imageChanged) {
    await deleteStoredImage(existing.imagePath);
  }

  return await getProductById(id);
}

export async function deleteProduct(id: string): Promise<boolean> {
  const existing = await getProductById(id);
  if (!existing) return false;

  if (supabase) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      throw new Error(`Ошибка удаления товара: ${error.message}`);
    }
  } else {
    sqlite.prepare('DELETE FROM products WHERE id = ?').run(id);
  }

  if (existing.imagePath) {
    await deleteStoredImage(existing.imagePath);
  }

  return true;
}
