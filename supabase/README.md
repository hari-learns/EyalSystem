# Supabase Wave 3

Wave 3 introduces the shared multi-store database schema and idempotent Eyal seed data.

This wave does not wire the storefront to Supabase yet. The public app still uses local fallback data until Wave 4.

## Files

- `migrations/20260630000100_initial_merchant_platform.sql`
  - creates stores, categories, products, variants, orders, order items, merchant users, commission rules, and commission entries
  - enables RLS
  - adds public read policies for active storefront catalog data
  - adds merchant read policies scoped through `merchant_users`
  - adds foreign-key and common search/status indexes
- `seed.sql`
  - upserts Eyal Chekku Oils
  - upserts four categories
  - upserts ten products and variants
  - can be run more than once

## Run With Supabase CLI

After credentials/project linking are available:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase db query --file supabase/seed.sql --linked
```

For local reset testing:

```bash
supabase start
supabase db reset
supabase db query --file supabase/seed.sql --local
```

## Run With `psql`

If using direct database URLs instead of Supabase CLI:

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260630000100_initial_merchant_platform.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

## Verification Queries

```sql
select slug, name, status from public.stores;

select c.name, count(p.id) as products
from public.categories c
left join public.products p on p.category_id = c.id
where c.store_id = (select id from public.stores where slug = 'eyal-chekku-oils')
group by c.name, c.display_order
order by c.display_order;

select p.name, v.label, v.price_inr
from public.products p
join public.product_variants v on v.product_id = p.id
where p.store_id = (select id from public.stores where slug = 'eyal-chekku-oils')
order by p.display_order, v.display_order;
```

Expected after seed:

- one `eyal-chekku-oils` store
- four categories
- ten products
- eighteen product variants

## Notes

- Merchant image editing is intentionally not modeled for V1.
- Product and logo image paths are platform-controlled text paths for now. Supabase Storage can be added later without changing merchant-facing controls.
- `availability_status` is the merchant-facing availability control.
- `is_visible` is a platform/catalog visibility flag, not a merchant-facing second stock toggle.
