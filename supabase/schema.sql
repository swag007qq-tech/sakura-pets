-- Sakura Pets: готові таблиця товарів, Storage-бакет та політики публічного доступу для роботи напряму з фронтенду (Vercel / Vite)
-- Скопіюйте весь код нижче у Supabase → SQL Editor → Run

-- 1. Таблиця товарів
create table if not exists public.products (
  id text primary key,
  name text not null,
  description text not null default '',
  price numeric not null default 0 check (price >= 0),
  currency text not null default 'грн',
  badges jsonb not null default '[]'::jsonb,
  stock integer not null default 1 check (stock >= 0),
  in_stock boolean not null default true,
  image_url text not null default '',
  image_path text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_created_at_idx
  on public.products (created_at asc);

-- 2. Публічний доступ до таблиці products (читання та запис через anon key на фронтенді)
alter table public.products enable row level security;

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
  on public.products
  for select
  to public
  using (true);

drop policy if exists "Public can insert products" on public.products;
create policy "Public can insert products"
  on public.products
  for insert
  to public
  with check (true);

drop policy if exists "Public can update products" on public.products;
create policy "Public can update products"
  on public.products
  for update
  to public
  using (true)
  with check (true);

drop policy if exists "Public can delete products" on public.products;
create policy "Public can delete products"
  on public.products
  for delete
  to public
  using (true);

-- 3. Сховище (Storage) для фотографій товарів
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- 4. Публічний доступ до фото в бакеті product-images (перегляд, завантаження, заміна, видалення)
drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'product-images');

drop policy if exists "Public can upload product images" on storage.objects;
create policy "Public can upload product images"
  on storage.objects
  for insert
  to public
  with check (bucket_id = 'product-images');

drop policy if exists "Public can update product images" on storage.objects;
create policy "Public can update product images"
  on storage.objects
  for update
  to public
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

drop policy if exists "Public can delete product images" on storage.objects;
create policy "Public can delete product images"
  on storage.objects
  for delete
  to public
  using (bucket_id = 'product-images');
