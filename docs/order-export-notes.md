# Order Export And Recovery Notes

Use these queries from Supabase SQL editor for manual reports or recovery.

## Orders For A Store

```sql
select
  o.order_number,
  s.name as store_name,
  o.customer_name,
  o.customer_phone,
  o.customer_address,
  o.customer_note,
  o.status,
  o.email_status,
  o.total_inr,
  o.item_count,
  o.placed_at
from public.orders o
join public.stores s on s.id = o.store_id
where s.slug = 'eyal-chekku-oils'
order by o.placed_at desc;
```

## Order Items

```sql
select
  o.order_number,
  oi.product_name_snapshot,
  oi.variant_label_snapshot,
  oi.price_inr_snapshot,
  oi.quantity,
  oi.line_total_inr
from public.order_items oi
join public.orders o on o.id = oi.order_id
join public.stores s on s.id = oi.store_id
where s.slug = 'eyal-chekku-oils'
order by o.placed_at desc, oi.created_at asc;
```

## Monthly Completed Commission Check

```sql
select
  s.name,
  count(*) filter (where o.status = 'completed') as completed_orders,
  coalesce(sum(o.total_inr) filter (where o.status = 'completed'), 0) as completed_value_inr
from public.orders o
join public.stores s on s.id = o.store_id
where o.placed_at >= date_trunc('month', now())
  and o.placed_at < date_trunc('month', now()) + interval '1 month'
group by s.name
order by s.name;
```

## Failed Email Recovery

```sql
select
  o.order_number,
  s.name,
  s.merchant_order_email,
  o.customer_name,
  o.customer_phone,
  o.email_error,
  o.placed_at
from public.orders o
join public.stores s on s.id = o.store_id
where o.email_status = 'failed'
order by o.placed_at desc;
```
