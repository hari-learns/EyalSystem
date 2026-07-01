# Merchant Onboarding Template

Use this checklist for every new local merchant. Do not create a new storefront codebase.

## Required Store Data

- Store name
- Store slug, lowercase hyphenated, for example `eyal-chekku-oils`
- Store location
- Contact numbers in `+91` format
- Merchant order email
- Merchant login email
- Product categories
- Product list with:
  - SKU
  - name
  - short name
  - description
  - image path
  - variants
  - prices
  - availability
- Commission rule

## Setup Steps

1. Create or update the `stores` row.
2. Set `merchant_order_email`.
3. Create categories.
4. Create products and variants.
5. Create or update the merchant user and `merchant_users` link:

```bash
npm run merchant:setup -- \
  --store eyal-chekku-oils \
  --email merchant@example.com \
  --password 'StrongPass123!' \
  --role owner \
  --order-email merchant@example.com
```

6. Set `commission_rules`.
7. Verify `/merchants/:storeSlug`.
8. Verify `/api/stores/:storeSlug/qr`.
9. Print the QR and test it from a phone.

## Manual Verification

- Merchant can log into `/merchantadmin/:storeSlug`.
- Merchant sees only their store.
- Product description, price, and availability updates reflect on storefront.
- Merchant can search orders by 10 digit Indian phone number.
- Owner report includes the store.

## Demo Store

A second demo store exists to prove storefront reuse and store isolation:

```txt
/merchants/demo-organic-mart
```

Do not treat demo data as a real merchant. Use it for testing new onboarding and access-isolation changes.

## Eyal First Store

Current storefront route:

```txt
/merchants/eyal-chekku-oils
```

Current merchant admin route:

```txt
/merchantadmin/eyal-chekku-oils
```

Current QR route:

```txt
/api/stores/eyal-chekku-oils/qr
```

Required live env for real operation:

```txt
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
SUPABASE_JWKS_URL
RESEND_API_KEY
ORDER_EMAIL_FROM
PLATFORM_OWNER_EMAILS
NEXT_PUBLIC_SITE_URL
```

Use `ORDER_EMAIL_TO` only as a temporary fallback. Long-term, set `stores.merchant_order_email`.
