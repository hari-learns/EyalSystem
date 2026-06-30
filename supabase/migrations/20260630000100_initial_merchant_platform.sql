create extension if not exists pgcrypto;

create type public.store_status as enum ('active', 'inactive');
create type public.product_availability_status as enum ('available', 'unavailable');
create type public.order_status as enum ('new', 'contacted', 'completed', 'cancelled');
create type public.email_status as enum ('not_sent', 'pending', 'sent', 'failed');
create type public.commission_type as enum ('flat', 'percentage');

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  nav_brand text not null,
  location text,
  logo_path text,
  contact_numbers text[] not null default '{}',
  merchant_order_email text,
  status public.store_status not null default 'active',
  theme jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint stores_contact_numbers_not_null check (array_position(contact_numbers, null) is null)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  display_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_store_slug_unique unique (store_id, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  sku text not null,
  name text not null,
  short_name text not null,
  description text not null default '',
  image_path text,
  availability_status public.product_availability_status not null default 'available',
  is_visible boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sku_format check (sku ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_store_sku_unique unique (store_id, sku)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  unit text not null default 'ml',
  unit_value integer not null,
  price_inr integer not null,
  availability_status public.product_availability_status not null default 'available',
  is_visible boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_unit_value_positive check (unit_value > 0),
  constraint product_variants_price_non_negative check (price_inr >= 0),
  constraint product_variants_product_label_unique unique (product_id, label)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  order_number bigint generated always as identity unique,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  customer_note text,
  status public.order_status not null default 'new',
  email_status public.email_status not null default 'not_sent',
  email_error text,
  subtotal_inr integer not null,
  total_inr integer not null,
  item_count integer not null,
  placed_at timestamptz not null default now(),
  contacted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_customer_phone_india check (customer_phone ~ '^\+91[0-9]{10}$'),
  constraint orders_totals_non_negative check (subtotal_inr >= 0 and total_inr >= 0),
  constraint orders_item_count_positive check (item_count > 0)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  product_name_snapshot text not null,
  variant_label_snapshot text not null,
  unit_snapshot text not null,
  unit_value_snapshot integer not null,
  price_inr_snapshot integer not null,
  quantity integer not null,
  line_total_inr integer not null,
  created_at timestamptz not null default now(),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_money_non_negative check (price_inr_snapshot >= 0 and line_total_inr >= 0),
  constraint order_items_unit_value_positive check (unit_value_snapshot > 0)
);

create table public.merchant_users (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'merchant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchant_users_role_check check (role in ('owner', 'merchant')),
  constraint merchant_users_store_user_unique unique (store_id, user_id)
);

create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  commission_type public.commission_type not null,
  value numeric(10, 2) not null,
  applies_from date not null default current_date,
  applies_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commission_rules_value_non_negative check (value >= 0),
  constraint commission_rules_date_order check (applies_until is null or applies_until >= applies_from),
  constraint commission_rules_store_name_from_unique unique (store_id, name, applies_from)
);

create table public.commission_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  commission_rule_id uuid references public.commission_rules(id) on delete set null,
  base_amount_inr integer not null,
  commission_amount_inr integer not null,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint commission_entries_amount_non_negative check (
    base_amount_inr >= 0 and commission_amount_inr >= 0
  ),
  constraint commission_entries_order_unique unique (order_id)
);

create index stores_status_idx on public.stores(status);
create index categories_store_id_idx on public.categories(store_id);
create index products_store_id_idx on public.products(store_id);
create index products_category_id_idx on public.products(category_id);
create index products_store_visible_idx on public.products(store_id, is_visible, availability_status);
create index product_variants_product_id_idx on public.product_variants(product_id);
create index product_variants_visible_idx on public.product_variants(product_id, is_visible, availability_status);
create index orders_store_id_placed_at_idx on public.orders(store_id, placed_at desc);
create index orders_store_status_idx on public.orders(store_id, status);
create index orders_customer_phone_idx on public.orders(customer_phone);
create index orders_customer_name_idx on public.orders using gin (to_tsvector('simple', customer_name));
create index order_items_order_id_idx on public.order_items(order_id);
create index order_items_store_id_idx on public.order_items(store_id);
create index order_items_product_id_idx on public.order_items(product_id);
create index order_items_product_variant_id_idx on public.order_items(product_variant_id);
create index merchant_users_store_id_idx on public.merchant_users(store_id);
create index merchant_users_user_id_idx on public.merchant_users(user_id);
create index commission_rules_store_id_idx on public.commission_rules(store_id);
create index commission_entries_store_id_idx on public.commission_entries(store_id);
create index commission_entries_order_id_idx on public.commission_entries(order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stores_set_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger merchant_users_set_updated_at
before update on public.merchant_users
for each row execute function public.set_updated_at();

create trigger commission_rules_set_updated_at
before update on public.commission_rules
for each row execute function public.set_updated_at();

create or replace function public.is_store_merchant(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.merchant_users mu
    where mu.store_id = target_store_id
      and mu.user_id = auth.uid()
  );
$$;

alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.merchant_users enable row level security;
alter table public.commission_rules enable row level security;
alter table public.commission_entries enable row level security;

create policy "public can read active stores"
on public.stores for select
to anon, authenticated
using (status = 'active');

create policy "merchants can read own stores"
on public.stores for select
to authenticated
using (public.is_store_merchant(id));

create policy "public can read visible categories"
on public.categories for select
to anon, authenticated
using (
  is_visible
  and exists (
    select 1 from public.stores s
    where s.id = categories.store_id
      and s.status = 'active'
  )
);

create policy "merchants can read own categories"
on public.categories for select
to authenticated
using (public.is_store_merchant(store_id));

create policy "public can read visible products"
on public.products for select
to anon, authenticated
using (
  is_visible
  and exists (
    select 1 from public.stores s
    where s.id = products.store_id
      and s.status = 'active'
  )
);

create policy "merchants can read own products"
on public.products for select
to authenticated
using (public.is_store_merchant(store_id));

create policy "public can read visible variants"
on public.product_variants for select
to anon, authenticated
using (
  is_visible
  and exists (
    select 1
    from public.products p
    join public.stores s on s.id = p.store_id
    where p.id = product_variants.product_id
      and p.is_visible
      and s.status = 'active'
  )
);

create policy "merchants can read own variants"
on public.product_variants for select
to authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_variants.product_id
      and public.is_store_merchant(p.store_id)
  )
);

create policy "merchants can read own orders"
on public.orders for select
to authenticated
using (public.is_store_merchant(store_id));

create policy "merchants can read own order items"
on public.order_items for select
to authenticated
using (public.is_store_merchant(store_id));

create policy "merchants can read own merchant records"
on public.merchant_users for select
to authenticated
using (public.is_store_merchant(store_id));

create policy "merchants can read own commission rules"
on public.commission_rules for select
to authenticated
using (public.is_store_merchant(store_id));

create policy "merchants can read own commission entries"
on public.commission_entries for select
to authenticated
using (public.is_store_merchant(store_id));
