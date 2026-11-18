import 'dotenv/config';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import {
  UPLOADS_DIR,
  createProduct,
  deleteProduct,
  deleteStoredImage,
  getStorageMode,
  listProducts,
  updateProduct,
  uploadProductImage,
} from './server/store.ts';
import type { PetBadgeId, ProductInput, ProductRecord } from './server/store.ts';
import {
  INACTIVITY_TIMEOUT_MS,
  checkLoginRateLimit,
  clearFailedLogins,
  clearSessionCookie,
  createAdminSession,
  extractSessionToken,
  recordFailedLogin,
  requireAdmin,
  revokeAdminSession,
  setSessionCookie,
  validateAndTouchSession,
  verifyAdminPassword,
} from './server/auth.ts';
import type { AdminRequest } from './server/auth.ts';

const PORT =
  process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);
const ALLOWED_BADGES = new Set<PetBadgeId>(['F', 'R', 'N', 'M']);
const BADGE_ORDER: PetBadgeId[] = ['M', 'N', 'F', 'R'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Допустимы только изображения (JPG, PNG, WEBP, GIF, AVIF)'));
    }
  },
});

const sseClients = new Set<Response>();

async function broadcastProductsUpdate(): Promise<void> {
  if (sseClients.size === 0) return;
  try {
    const products = await listProducts();
    const payload = `event: products_updated\ndata: ${JSON.stringify({ products })}\n\n`;
    for (const client of sseClients) {
      client.write(payload);
    }
  } catch (err) {
    console.error('Failed to broadcast products update:', err);
  }
}

function validateProductPayload(
  body: unknown
): { ok: true; data: ProductInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Некорректные данные товара' };
  }

  const raw = body as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  const currency = typeof raw.currency === 'string' && raw.currency.trim() ? raw.currency.trim() : 'грн';
  const imageUrl = typeof raw.imageUrl === 'string' ? raw.imageUrl.trim() : '';
  const imagePath = typeof raw.imagePath === 'string' ? raw.imagePath.trim() : '';

  const rawBadges = Array.isArray(raw.badges) ? raw.badges : [];
  const badgeSet = new Set<PetBadgeId>();
  for (const entry of rawBadges) {
    if (typeof entry === 'string' && ALLOWED_BADGES.has(entry as PetBadgeId)) {
      badgeSet.add(entry as PetBadgeId);
    }
  }
  const badges = BADGE_ORDER.filter((b) => badgeSet.has(b));

  const priceNum = Number(raw.price);
  const stockNum = raw.stock === undefined || raw.stock === '' ? 0 : Number(raw.stock);
  const inStock =
    typeof raw.inStock === 'boolean'
      ? raw.inStock
      : Number.isFinite(stockNum)
        ? stockNum > 0
        : true;

  if (!name) {
    return { ok: false, error: 'Укажите название товара' };
  }
  if (name.length > 120) {
    return { ok: false, error: 'Название товара не должно превышать 120 символов' };
  }
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return { ok: false, error: 'Укажите корректную цену (число не меньше 0)' };
  }
  if (badges.length === 0) {
    return { ok: false, error: 'Выберите хотя бы один значок (F, R, N или M)' };
  }
  if (!Number.isInteger(stockNum) || stockNum < 0) {
    return { ok: false, error: 'Количество в наличии должно быть целым числом >= 0' };
  }

  return {
    ok: true,
    data: {
      name,
      description,
      price: Math.round(priceNum * 100) / 100,
      currency: currency.slice(0, 12),
      badges,
      stock: stockNum,
      inStock,
      imageUrl,
      imagePath,
    },
  };
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  // Serve uploaded product photos cleanly from persistent server directory
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d' }), (_req: Request, res: Response) => {
    res.status(404).end();
  });

  // Public catalog endpoints
  app.get('/api/products', async (_req: Request, res: Response) => {
    try {
      const products: ProductRecord[] = await listProducts();
      res.setHeader('Cache-Control', 'no-store');
      res.json({ products, storageMode: getStorageMode() });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ошибка загрузки каталога';
      res.status(500).json({ error: msg });
    }
  });

  // Real-time Server-Sent Events stream for instant cross-device catalog sync
  app.get('/api/products/stream', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);

    try {
      const products = await listProducts();
      res.write(`event: products_updated\ndata: ${JSON.stringify({ products })}\n\n`);
    } catch {
      // Client will still receive subsequent updates or fallback poll
    }

    const heartbeat = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // Admin auth endpoints
  app.get('/api/admin/session', (req: Request, res: Response) => {
    const token = extractSessionToken(req);
    if (!token) {
      res.json({ authenticated: false, inactivityTimeoutMs: INACTIVITY_TIMEOUT_MS });
      return;
    }

    const check = validateAndTouchSession(token, false);
    if (!check.valid) {
      clearSessionCookie(res, req);
      res.json({ authenticated: false, inactivityTimeoutMs: INACTIVITY_TIMEOUT_MS });
      return;
    }

    res.json({
      authenticated: true,
      expiresAt: check.expiresAt,
      inactivityTimeoutMs: INACTIVITY_TIMEOUT_MS,
    });
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const rate = checkLoginRateLimit(ip);
    if (!rate.allowed) {
      res.status(429).json({
        error: `Слишком много неверных попыток. Повторите через ${rate.retryAfterSec} сек.`,
      });
      return;
    }

    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!verifyAdminPassword(password)) {
      recordFailedLogin(ip);
      res.status(401).json({ error: 'Неверный пароль администратора' });
      return;
    }

    clearFailedLogins(ip);
    const { token, expiresAt } = createAdminSession();
    setSessionCookie(res, req, token);
    res.json({
      ok: true,
      token,
      expiresAt,
      inactivityTimeoutMs: INACTIVITY_TIMEOUT_MS,
    });
  });

  app.post('/api/admin/logout', (req: Request, res: Response) => {
    const token = extractSessionToken(req);
    if (token) {
      revokeAdminSession(token);
    }
    clearSessionCookie(res, req);
    res.json({ ok: true });
  });

  // Protected Admin CRUD + Image Upload endpoints
  app.post(
    '/api/admin/upload',
    requireAdmin,
    (req: AdminRequest, res: Response) => {
      upload.single('image')(req, res, async (err: unknown) => {
        if (err) {
          const message =
            err instanceof Error ? err.message : 'Не удалось загрузить фотографию';
          res.status(400).json({ error: message });
          return;
        }
        if (!req.file) {
          res.status(400).json({ error: 'Файл изображения не выбран' });
          return;
        }
        try {
          const result = await uploadProductImage(req.file.buffer, req.file.mimetype);
          res.json({
            ...result,
            expiresAt: req.adminExpiresAt,
          });
        } catch (uploadErr) {
          const message =
            uploadErr instanceof Error ? uploadErr.message : 'Ошибка сохранения файла';
          res.status(500).json({ error: message });
        }
      });
    }
  );

  app.delete('/api/admin/upload', requireAdmin, async (req: AdminRequest, res: Response) => {
    const imagePath = typeof req.body?.imagePath === 'string' ? req.body.imagePath : '';
    if (imagePath) {
      await deleteStoredImage(imagePath);
    }
    res.json({ ok: true, expiresAt: req.adminExpiresAt });
  });

  app.post('/api/admin/products', requireAdmin, async (req: AdminRequest, res: Response) => {
    const parsed = validateProductPayload(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const product = await createProduct(parsed.data);
      await broadcastProductsUpdate();
      res.status(201).json({ product, expiresAt: req.adminExpiresAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка создания товара';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req: AdminRequest, res: Response) => {
    const id = String(req.params.id || '').trim();
    if (!id) {
      res.status(400).json({ error: 'Не указан ID товара' });
      return;
    }

    const parsed = validateProductPayload(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const product = await updateProduct(id, parsed.data);
      if (!product) {
        res.status(404).json({ error: 'Товар не найден' });
        return;
      }
      await broadcastProductsUpdate();
      res.json({ product, expiresAt: req.adminExpiresAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка обновления товара';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req: AdminRequest, res: Response) => {
    const id = String(req.params.id || '').trim();
    if (!id) {
      res.status(400).json({ error: 'Не указан ID товара' });
      return;
    }

    try {
      const deleted = await deleteProduct(id);
      if (!deleted) {
        res.status(404).json({ error: 'Товар не найден' });
        return;
      }
      await broadcastProductsUpdate();
      res.json({ ok: true, id, expiresAt: req.adminExpiresAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка удаления товара';
      res.status(500).json({ error: message });
    }
  });

  // Frontend Vite middleware (dev) or static dist serving (production)
  if (process.env.NODE_ENV !== 'production') {
    const [{ createServer: createViteServer }, { default: react }, { default: tailwindcss }] =
      await Promise.all([
        import('vite'),
        import('@vitejs/plugin-react'),
        import('@tailwindcss/vite'),
      ]);
    const vite = await createViteServer({
      configFile: false,
      root: process.cwd(),
      cacheDir: path.join(os.tmpdir(), 'sakura-vite-cache'),
      plugins: [react(), tailwindcss()],
      resolve: {
        alias: {
          '@': process.cwd(),
        },
      },
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sakura Pets server listening on http://0.0.0.0:${PORT} (storage: ${getStorageMode()})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
