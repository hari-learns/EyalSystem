#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const args = parseArgs(process.argv.slice(2));

const storeSlug = args.store;
const email = args.email;
const password = args.password;
const role = args.role ?? "owner";
const orderEmail = args.orderEmail ?? email;

if (!storeSlug || !email || !password) {
  console.error(
    [
      "Usage:",
      "  node scripts/setup-merchant.mjs --store eyal-chekku-oils --email merchant@example.com --password 'StrongPass123!'",
      "",
      "Optional:",
      "  --role owner|merchant",
      "  --order-email orders@example.com"
    ].join("\n")
  );
  process.exit(1);
}

if (!["owner", "merchant"].includes(role)) {
  console.error("--role must be owner or merchant.");
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("Missing SUPABASE_URL and SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const store = await getStore(storeSlug);
const user = await getOrCreateUser(email, password);

const { error: linkError } = await supabase.from("merchant_users").upsert(
  {
    store_id: store.id,
    user_id: user.id,
    role
  },
  {
    onConflict: "store_id,user_id"
  }
);

if (linkError) {
  throw linkError;
}

if (orderEmail) {
  const { error: storeUpdateError } = await supabase
    .from("stores")
    .update({
      merchant_order_email: orderEmail,
      updated_at: new Date().toISOString()
    })
    .eq("id", store.id);

  if (storeUpdateError) {
    throw storeUpdateError;
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      store: store.slug,
      merchantEmail: email,
      userId: user.id,
      role,
      merchantOrderEmailSet: Boolean(orderEmail)
    },
    null,
    2
  )
);

async function getStore(slug) {
  const { data, error } = await supabase
    .from("stores")
    .select("id, slug, name")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    throw new Error(`Store not found: ${slug}`);
  }

  return data;
}

async function getOrCreateUser(userEmail, userPassword) {
  const existing = await findUserByEmail(userEmail);

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: userPassword,
      email_confirm: true
    });

    if (error) {
      throw error;
    }

    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: userEmail,
    password: userPassword,
    email_confirm: true
  });

  if (error) {
    throw error;
  }

  return data.user;
}

async function findUserByEmail(userEmail) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100
    });

    if (error) {
      throw error;
    }

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === userEmail.toLowerCase()
    );

    if (found) return found;
    if (data.users.length < 100) return null;

    page += 1;
  }
}

function parseArgs(values) {
  const parsed = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (!value.startsWith("--")) continue;

    const key = toCamelCase(value.slice(2));
    const next = values[index + 1];

    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
