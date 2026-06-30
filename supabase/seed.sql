with upsert_store as (
  insert into public.stores (
    slug,
    name,
    nav_brand,
    location,
    logo_path,
    contact_numbers,
    status,
    theme,
    settings
  )
  values (
    'eyal-chekku-oils',
    'Eyal Chekku Oils',
    'EYAL CHEKKU',
    'Chennai, India',
    '/assets/eyal-logo-transparent.png',
    array['+91 97863 64331', '+91 98404 45725'],
    'active',
    '{"primary":"#2b1d12","accent":"#a67c2e","surface":"#f5efe3"}'::jsonb,
    '{"requires_phone_verification":false}'::jsonb
  )
  on conflict (slug) do update set
    name = excluded.name,
    nav_brand = excluded.nav_brand,
    location = excluded.location,
    logo_path = excluded.logo_path,
    contact_numbers = excluded.contact_numbers,
    status = excluded.status,
    theme = excluded.theme,
    settings = excluded.settings,
    updated_at = now()
  returning id
),
store_row as (
  select id from upsert_store
  union
  select id from public.stores where slug = 'eyal-chekku-oils'
),
category_seed(slug, name, description, display_order) as (
  values
    ('oils', 'Oils', 'Cold-pressed and natural oils for everyday home use.', 10),
    ('rice-poha', 'Rice & Poha', 'Reserved for future grains and breakfast staples.', 20),
    ('nuts-seeds', 'Nuts & Seeds', 'Reserved for future raw nuts, seeds, and pantry items.', 30),
    ('others', 'Others', 'Special care and household products.', 40)
),
upsert_categories as (
  insert into public.categories (store_id, slug, name, description, display_order, is_visible)
  select store_row.id, category_seed.slug, category_seed.name, category_seed.description,
    category_seed.display_order, true
  from store_row
  cross join category_seed
  on conflict (store_id, slug) do update set
    name = excluded.name,
    description = excluded.description,
    display_order = excluded.display_order,
    is_visible = excluded.is_visible,
    updated_at = now()
  returning id, slug
),
category_rows as (
  select id, slug from upsert_categories
  union
  select c.id, c.slug
  from public.categories c
  join store_row on store_row.id = c.store_id
),
product_seed(
  sku,
  category_slug,
  name,
  short_name,
  description,
  image_path,
  display_order
) as (
  values
    (
      'coconut-oil',
      'oils',
      'Cold Wood-Pressed Coconut Oil',
      'Coconut Oil',
      'Light and faintly sweet - good for tempering, hair and skin.',
      '/images/coconut.jpg',
      10
    ),
    (
      'sesame-oil',
      'oils',
      'Cold Wood-Pressed Sesame Oil',
      'Sesame Oil',
      'Nutty and warm - the everyday oil of Tamil kitchens.',
      '/images/sesame.jpg',
      20
    ),
    (
      'groundnut-oil',
      'oils',
      'Cold Wood-Pressed Groundnut Oil',
      'Groundnut Oil',
      'Mild, steady and practical - built for everyday cooking.',
      '/images/groundnut.jpg',
      30
    ),
    (
      'mustard-oil',
      'oils',
      'Mustard Oil',
      'Mustard Oil',
      'Sharp and pungent - wakes up pickles and curries.',
      '/images/mustard.jpg',
      40
    ),
    (
      'olive-oil',
      'oils',
      'Olive Oil',
      'Olive Oil',
      'Smooth and clean - suited for light cooking and finishing.',
      '/images/coconut.jpg',
      50
    ),
    (
      'neem-oil',
      'oils',
      'Neem Oil',
      'Neem Oil',
      'Traditional neem oil for home and garden care routines.',
      '/images/mustard.jpg',
      60
    ),
    (
      'castor-oil',
      'oils',
      'Castor Oil',
      'Castor Oil',
      'Thick, rich oil commonly used for hair and skin care.',
      '/images/groundnut.jpg',
      70
    ),
    (
      'deepa-oil',
      'oils',
      'Deepa Oil',
      'Deepa Oil',
      'Prepared for daily lamp lighting and pooja use.',
      '/images/sesame.jpg',
      80
    ),
    (
      'iluppa-oil',
      'oils',
      'Iluppa Oil (Mahua Oil)',
      'Iluppa Oil',
      'Natural mahua oil for traditional household uses.',
      '/images/sesame.jpg',
      90
    ),
    (
      'rosemary-hair-oil',
      'others',
      'Homemade Rosemary Hair Oil',
      'Rosemary Hair Oil',
      'Homemade hair oil with rosemary for regular scalp care.',
      '/images/coconut.jpg',
      100
    )
),
upsert_products as (
  insert into public.products (
    store_id,
    category_id,
    sku,
    name,
    short_name,
    description,
    image_path,
    availability_status,
    is_visible,
    display_order
  )
  select
    store_row.id,
    category_rows.id,
    product_seed.sku,
    product_seed.name,
    product_seed.short_name,
    product_seed.description,
    product_seed.image_path,
    'available',
    true,
    product_seed.display_order
  from product_seed
  join category_rows on category_rows.slug = product_seed.category_slug
  cross join store_row
  on conflict (store_id, sku) do update set
    category_id = excluded.category_id,
    name = excluded.name,
    short_name = excluded.short_name,
    description = excluded.description,
    image_path = excluded.image_path,
    availability_status = excluded.availability_status,
    is_visible = excluded.is_visible,
    display_order = excluded.display_order,
    updated_at = now()
  returning id, sku
),
product_rows as (
  select id, sku from upsert_products
  union
  select p.id, p.sku
  from public.products p
  join store_row on store_row.id = p.store_id
),
variant_seed(product_sku, label, unit, unit_value, price_inr, display_order) as (
  values
    ('coconut-oil', '500 ml', 'ml', 500, 200, 10),
    ('coconut-oil', '1 L', 'ml', 1000, 400, 20),
    ('coconut-oil', '5 L', 'ml', 5000, 1970, 30),
    ('sesame-oil', '500 ml', 'ml', 500, 210, 10),
    ('sesame-oil', '1 L', 'ml', 1000, 420, 20),
    ('sesame-oil', '5 L', 'ml', 5000, 2050, 30),
    ('groundnut-oil', '500 ml', 'ml', 500, 130, 10),
    ('groundnut-oil', '1 L', 'ml', 1000, 250, 20),
    ('groundnut-oil', '5 L', 'ml', 5000, 1220, 30),
    ('mustard-oil', '200 ml', 'ml', 200, 60, 10),
    ('olive-oil', '200 ml', 'ml', 200, 200, 10),
    ('neem-oil', '200 ml', 'ml', 200, 70, 10),
    ('castor-oil', '200 ml', 'ml', 200, 70, 10),
    ('castor-oil', '500 ml', 'ml', 500, 150, 20),
    ('deepa-oil', '500 ml', 'ml', 500, 110, 10),
    ('deepa-oil', '1 L', 'ml', 1000, 210, 20),
    ('iluppa-oil', '200 ml', 'ml', 200, 60, 10),
    ('rosemary-hair-oil', '200 ml', 'ml', 200, 200, 10)
)
insert into public.product_variants (
  product_id,
  label,
  unit,
  unit_value,
  price_inr,
  availability_status,
  is_visible,
  display_order
)
select
  product_rows.id,
  variant_seed.label,
  variant_seed.unit,
  variant_seed.unit_value,
  variant_seed.price_inr,
  'available',
  true,
  variant_seed.display_order
from variant_seed
join product_rows on product_rows.sku = variant_seed.product_sku
on conflict (product_id, label) do update set
  unit = excluded.unit,
  unit_value = excluded.unit_value,
  price_inr = excluded.price_inr,
  availability_status = excluded.availability_status,
  is_visible = excluded.is_visible,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.commission_rules (
  store_id,
  name,
  commission_type,
  value,
  applies_from,
  is_active
)
select
  stores.id,
  'Default completed order commission',
  'flat',
  0,
  current_date,
  true
from public.stores
where stores.slug = 'eyal-chekku-oils'
on conflict (store_id, name, applies_from) do update set
  commission_type = excluded.commission_type,
  value = excluded.value,
  is_active = excluded.is_active,
  updated_at = now();

with upsert_store as (
  insert into public.stores (
    slug,
    name,
    nav_brand,
    location,
    logo_path,
    contact_numbers,
    status,
    theme,
    settings
  )
  values (
    'demo-organic-mart',
    'Demo Organic Mart',
    'DEMO MART',
    'Chennai, India',
    '/assets/eyal-logo-transparent.png',
    array['+91 90000 00000'],
    'active',
    '{"primary":"#24351f","accent":"#8d6b2d","surface":"#f5efe3"}'::jsonb,
    '{"requires_phone_verification":false}'::jsonb
  )
  on conflict (slug) do update set
    name = excluded.name,
    nav_brand = excluded.nav_brand,
    location = excluded.location,
    logo_path = excluded.logo_path,
    contact_numbers = excluded.contact_numbers,
    status = excluded.status,
    theme = excluded.theme,
    settings = excluded.settings,
    updated_at = now()
  returning id
),
store_row as (
  select id from upsert_store
  union
  select id from public.stores where slug = 'demo-organic-mart'
),
category_seed(slug, name, description, display_order) as (
  values
    ('pantry', 'Pantry', 'Everyday demo staples for validating multi-store setup.', 10),
    ('care', 'Care', 'Demo personal and home care products.', 20)
),
upsert_categories as (
  insert into public.categories (store_id, slug, name, description, display_order, is_visible)
  select store_row.id, category_seed.slug, category_seed.name, category_seed.description,
    category_seed.display_order, true
  from store_row
  cross join category_seed
  on conflict (store_id, slug) do update set
    name = excluded.name,
    description = excluded.description,
    display_order = excluded.display_order,
    is_visible = excluded.is_visible,
    updated_at = now()
  returning id, slug
),
category_rows as (
  select id, slug from upsert_categories
  union
  select c.id, c.slug
  from public.categories c
  join store_row on store_row.id = c.store_id
),
product_seed(
  sku,
  category_slug,
  name,
  short_name,
  description,
  image_path,
  display_order
) as (
  values
    (
      'demo-coconut-oil',
      'pantry',
      'Demo Coconut Oil',
      'Coconut Oil',
      'Demo cold-pressed oil used to validate reusable storefront behavior.',
      '/images/coconut.jpg',
      10
    ),
    (
      'demo-groundnut-oil',
      'pantry',
      'Demo Groundnut Oil',
      'Groundnut Oil',
      'Demo everyday cooking oil for second-store isolation checks.',
      '/images/groundnut.jpg',
      20
    ),
    (
      'demo-herbal-hair-oil',
      'care',
      'Demo Herbal Hair Oil',
      'Herbal Hair Oil',
      'Demo care product to verify non-pantry category rendering.',
      '/images/sesame.jpg',
      30
    )
),
upsert_products as (
  insert into public.products (
    store_id,
    category_id,
    sku,
    name,
    short_name,
    description,
    image_path,
    availability_status,
    is_visible,
    display_order
  )
  select
    store_row.id,
    category_rows.id,
    product_seed.sku,
    product_seed.name,
    product_seed.short_name,
    product_seed.description,
    product_seed.image_path,
    'available',
    true,
    product_seed.display_order
  from product_seed
  join category_rows on category_rows.slug = product_seed.category_slug
  cross join store_row
  on conflict (store_id, sku) do update set
    category_id = excluded.category_id,
    name = excluded.name,
    short_name = excluded.short_name,
    description = excluded.description,
    image_path = excluded.image_path,
    availability_status = excluded.availability_status,
    is_visible = excluded.is_visible,
    display_order = excluded.display_order,
    updated_at = now()
  returning id, sku
),
product_rows as (
  select id, sku from upsert_products
  union
  select p.id, p.sku
  from public.products p
  join store_row on store_row.id = p.store_id
),
variant_seed(product_sku, label, unit, unit_value, price_inr, display_order) as (
  values
    ('demo-coconut-oil', '500 ml', 'ml', 500, 180, 10),
    ('demo-coconut-oil', '1 L', 'ml', 1000, 350, 20),
    ('demo-groundnut-oil', '500 ml', 'ml', 500, 140, 10),
    ('demo-groundnut-oil', '1 L', 'ml', 1000, 270, 20),
    ('demo-herbal-hair-oil', '200 ml', 'ml', 200, 160, 10)
)
insert into public.product_variants (
  product_id,
  label,
  unit,
  unit_value,
  price_inr,
  availability_status,
  is_visible,
  display_order
)
select
  product_rows.id,
  variant_seed.label,
  variant_seed.unit,
  variant_seed.unit_value,
  variant_seed.price_inr,
  'available',
  true,
  variant_seed.display_order
from variant_seed
join product_rows on product_rows.sku = variant_seed.product_sku
on conflict (product_id, label) do update set
  unit = excluded.unit,
  unit_value = excluded.unit_value,
  price_inr = excluded.price_inr,
  availability_status = excluded.availability_status,
  is_visible = excluded.is_visible,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.commission_rules (
  store_id,
  name,
  commission_type,
  value,
  applies_from,
  is_active
)
select
  stores.id,
  'Default completed order commission',
  'flat',
  0,
  current_date,
  true
from public.stores
where stores.slug = 'demo-organic-mart'
on conflict (store_id, name, applies_from) do update set
  commission_type = excluded.commission_type,
  value = excluded.value,
  is_active = excluded.is_active,
  updated_at = now();
