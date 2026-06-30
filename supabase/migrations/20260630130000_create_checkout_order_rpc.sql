create or replace function public.create_checkout_order(
  p_store_slug text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_note text,
  p_items jsonb,
  p_phone_verified boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.stores%rowtype;
  v_order public.orders%rowtype;
  v_item_count integer;
  v_subtotal_inr integer;
  v_items_json jsonb;
begin
  select *
  into v_store
  from public.stores
  where slug = p_store_slug
    and status = 'active';

  if not found then
    raise exception 'STORE_UNAVAILABLE';
  end if;

  if coalesce((v_store.settings ->> 'requires_phone_verification')::boolean, false)
    and not p_phone_verified then
    raise exception 'PHONE_VERIFICATION_REQUIRED';
  end if;

  if p_customer_name is null or length(trim(p_customer_name)) < 2 then
    raise exception 'INVALID_CUSTOMER_NAME';
  end if;

  if p_customer_phone is null or p_customer_phone !~ '^\+91[0-9]{10}$' then
    raise exception 'INVALID_CUSTOMER_PHONE';
  end if;

  if p_customer_address is null or length(trim(p_customer_address)) < 5 then
    raise exception 'INVALID_CUSTOMER_ADDRESS';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CART_EMPTY';
  end if;

  if jsonb_array_length(p_items) > 30 then
    raise exception 'CART_TOO_LARGE';
  end if;

  create temp table if not exists checkout_rpc_items (
    variant_id uuid not null,
    quantity integer not null
  ) on commit drop;

  truncate table checkout_rpc_items;

  insert into checkout_rpc_items (variant_id, quantity)
  select item.variant_id, item.quantity
  from jsonb_to_recordset(p_items) as item(variant_id uuid, quantity integer);

  if exists (
    select 1
    from checkout_rpc_items
    where quantity < 1 or quantity > 99
  ) then
    raise exception 'INVALID_CART_ITEM';
  end if;

  if (
    select count(*)
    from checkout_rpc_items
  ) <> (
    select count(distinct variant_id)
    from checkout_rpc_items
  ) then
    raise exception 'DUPLICATE_CART_ITEM';
  end if;

  if exists (
    select 1
    from checkout_rpc_items ci
    left join public.product_variants pv on pv.id = ci.variant_id
    left join public.products p on p.id = pv.product_id
    where pv.id is null
      or p.id is null
      or p.store_id <> v_store.id
      or not pv.is_visible
      or pv.availability_status <> 'available'
      or not p.is_visible
      or p.availability_status <> 'available'
  ) then
    raise exception 'CART_ITEM_UNAVAILABLE';
  end if;

  select
    sum(ci.quantity)::integer,
    sum(ci.quantity * pv.price_inr)::integer
  into v_item_count, v_subtotal_inr
  from checkout_rpc_items ci
  join public.product_variants pv on pv.id = ci.variant_id;

  insert into public.orders (
    store_id,
    customer_name,
    customer_phone,
    customer_address,
    customer_note,
    status,
    email_status,
    subtotal_inr,
    total_inr,
    item_count
  )
  values (
    v_store.id,
    trim(p_customer_name),
    p_customer_phone,
    trim(p_customer_address),
    nullif(trim(coalesce(p_customer_note, '')), ''),
    'new',
    'pending',
    v_subtotal_inr,
    v_subtotal_inr,
    v_item_count
  )
  returning * into v_order;

  insert into public.order_items (
    order_id,
    store_id,
    product_id,
    product_variant_id,
    product_name_snapshot,
    variant_label_snapshot,
    unit_snapshot,
    unit_value_snapshot,
    price_inr_snapshot,
    quantity,
    line_total_inr
  )
  select
    v_order.id,
    v_store.id,
    p.id,
    pv.id,
    p.name,
    pv.label,
    pv.unit,
    pv.unit_value,
    pv.price_inr,
    ci.quantity,
    ci.quantity * pv.price_inr
  from checkout_rpc_items ci
  join public.product_variants pv on pv.id = ci.variant_id
  join public.products p on p.id = pv.product_id;

  select jsonb_agg(
    jsonb_build_object(
      'productName', oi.product_name_snapshot,
      'variantLabel', oi.variant_label_snapshot,
      'unit', oi.unit_snapshot,
      'unitValue', oi.unit_value_snapshot,
      'priceInr', oi.price_inr_snapshot,
      'quantity', oi.quantity,
      'lineTotalInr', oi.line_total_inr
    )
    order by oi.created_at asc
  )
  into v_items_json
  from public.order_items oi
  where oi.order_id = v_order.id;

  return jsonb_build_object(
    'store', jsonb_build_object(
      'id', v_store.id,
      'name', v_store.name,
      'merchantOrderEmail', v_store.merchant_order_email
    ),
    'order', jsonb_build_object(
      'id', v_order.id,
      'orderNumber', v_order.order_number,
      'customerName', v_order.customer_name,
      'customerPhone', v_order.customer_phone,
      'customerAddress', v_order.customer_address,
      'customerNote', v_order.customer_note,
      'totalInr', v_order.total_inr,
      'status', v_order.status,
      'emailStatus', v_order.email_status
    ),
    'items', coalesce(v_items_json, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.create_checkout_order(text, text, text, text, text, jsonb, boolean)
from public, anon, authenticated;

grant execute on function public.create_checkout_order(text, text, text, text, text, jsonb, boolean)
to service_role;
