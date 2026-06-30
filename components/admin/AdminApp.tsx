"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { formatMoney } from "@/lib/money";

type AdminStore = {
  id: string;
  slug: string;
  name: string;
  role: string;
};

type AdminUser = {
  email: string;
  isOwner: boolean;
  stores: AdminStore[];
};

type ProductVariantAdmin = {
  id: string;
  label: string;
  unitValue: number;
  priceInr: number;
  availabilityStatus: "available" | "unavailable";
};

type ProductAdmin = {
  id: string;
  name: string;
  description: string;
  availabilityStatus: "available" | "unavailable";
  variants: ProductVariantAdmin[];
};

type OrderAdmin = {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerNote: string | null;
  status: "new" | "contacted" | "completed" | "cancelled";
  emailStatus: "not_sent" | "pending" | "sent" | "failed";
  emailError: string | null;
  totalInr: number;
  itemCount: number;
  placedAt: string;
  items: {
    id: string;
    productName: string;
    variantLabel: string;
    quantity: number;
    lineTotalInr: number;
  }[];
};

type OwnerReport = {
  month: string;
  stores: {
    id: string;
    slug: string;
    name: string;
    submittedOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    completedValueInr: number;
    commissionDueInr: number;
  }[];
};

type Tab = "products" | "orders" | "owner";

let browserClient: SupabaseClient | null = null;

async function getBrowserClient() {
  if (browserClient) return browserClient;

  const response = await fetch("/api/public-config");
  const config = (await response.json()) as {
    supabaseUrl?: string;
    supabasePublishableKey?: string;
    error?: string;
  };

  if (!response.ok || !config.supabaseUrl || !config.supabasePublishableKey) {
    throw new Error(config.error ?? "Missing Supabase config.");
  }

  browserClient = createClient(config.supabaseUrl, config.supabasePublishableKey);
  return browserClient;
}

export function AdminApp() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedStoreSlug, setSelectedStoreSlug] = useState("");
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [orders, setOrders] = useState<OrderAdmin[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState<OwnerReport | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedStore = useMemo(
    () => user?.stores.find((store) => store.slug === selectedStoreSlug) ?? user?.stores[0],
    [selectedStoreSlug, user]
  );

  useEffect(() => {
    getBrowserClient()
      .then(async (client) => {
        setSupabase(client);
        const { data } = await client.auth.getSession();
        const token = data.session?.access_token ?? null;
        setAccessToken(token);

        if (token) {
          await loadMe(token);
        }
      })
      .catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (!accessToken || !selectedStore?.slug) return;
    if (tab === "products") void loadProducts();
    if (tab === "orders") void loadOrders();
    if (tab === "owner" && user?.isOwner) void loadOwnerReport();
  }, [accessToken, selectedStore?.slug, tab]);

  async function login() {
    if (!supabase) return;
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session?.access_token) {
      setLoading(false);
      setMessage(error?.message ?? "Login failed.");
      return;
    }

    setAccessToken(data.session.access_token);
    await loadMe(data.session.access_token);
    setLoading(false);
  }

  async function logout() {
    await supabase?.auth.signOut();
    setAccessToken(null);
    setUser(null);
    setProducts([]);
    setOrders([]);
  }

  async function loadMe(token = accessToken) {
    if (!token) return;
    const payload = await api<{ user: AdminUser }>("/api/admin/me", token);
    setUser(payload.user);
    setSelectedStoreSlug(payload.user.stores[0]?.slug ?? "");
  }

  async function loadProducts() {
    if (!accessToken || !selectedStore) return;
    const payload = await api<{ products: ProductAdmin[] }>(
      `/api/admin/products?storeSlug=${encodeURIComponent(selectedStore.slug)}`,
      accessToken
    );
    setProducts(payload.products);
  }

  async function saveProduct(product: ProductAdmin) {
    if (!accessToken || !selectedStore) return;
    setLoading(true);
    await api(
      "/api/admin/products",
      accessToken,
      {
        method: "PATCH",
        body: JSON.stringify({
          storeSlug: selectedStore.slug,
          productId: product.id,
          description: product.description,
          availabilityStatus: product.availabilityStatus,
          variants: product.variants
        })
      }
    );
    setLoading(false);
    setMessage("Product updated.");
    await loadProducts();
  }

  async function loadOrders() {
    if (!accessToken || !selectedStore) return;
    const params = new URLSearchParams({ storeSlug: selectedStore.slug });
    if (orderSearch.trim()) params.set("search", orderSearch.trim());
    if (orderStatus) params.set("status", orderStatus);

    const payload = await api<{ orders: OrderAdmin[] }>(
      `/api/admin/orders?${params.toString()}`,
      accessToken
    );
    setOrders(payload.orders);
  }

  async function updateOrderStatus(orderId: string, status: OrderAdmin["status"]) {
    if (!accessToken || !selectedStore) return;
    await api("/api/admin/orders", accessToken, {
      method: "PATCH",
      body: JSON.stringify({ storeSlug: selectedStore.slug, orderId, status })
    });
    setMessage("Order status updated.");
    await loadOrders();
  }

  async function loadOwnerReport() {
    if (!accessToken) return;
    const payload = await api<OwnerReport>(
      `/api/owner/report?month=${encodeURIComponent(reportMonth)}`,
      accessToken
    );
    setReport(payload);
  }

  function updateProduct(productId: string, update: Partial<ProductAdmin>) {
    setProducts((current) =>
      current.map((product) => (product.id === productId ? { ...product, ...update } : product))
    );
  }

  function updateVariant(
    productId: string,
    variantId: string,
    update: Partial<ProductVariantAdmin>
  ) {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? {
              ...product,
              variants: product.variants.map((variant) =>
                variant.id === variantId ? { ...variant, ...update } : variant
              )
            }
          : product
      )
    );
  }

  if (!accessToken || !user) {
    return (
      <main className="admin-shell">
        <section className="admin-login">
          <p className="eyebrow">Merchant Portal</p>
          <h1>Eyal System Admin</h1>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input
              value={password}
              type="password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button type="button" onClick={login} disabled={loading || !supabase}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          {message ? <p className="admin-message">{message}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Merchant Portal</p>
          <h1>Eyal System Admin</h1>
          <p>{user.email}</p>
        </div>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </header>

      <section className="admin-toolbar">
        <label>
          Store
          <select
            value={selectedStore?.slug ?? ""}
            onChange={(event) => setSelectedStoreSlug(event.target.value)}
          >
            {user.stores.map((store) => (
              <option value={store.slug} key={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
        <nav className="admin-tabs">
          <button type="button" aria-pressed={tab === "products"} onClick={() => setTab("products")}>
            Products
          </button>
          <button type="button" aria-pressed={tab === "orders"} onClick={() => setTab("orders")}>
            Orders
          </button>
          {user.isOwner ? (
            <button type="button" aria-pressed={tab === "owner"} onClick={() => setTab("owner")}>
              Owner
            </button>
          ) : null}
        </nav>
      </section>

      {message ? <p className="admin-message">{message}</p> : null}

      {tab === "products" ? (
        <section className="admin-grid">
          {products.map((product) => (
            <article className="admin-card" key={product.id}>
              <div className="admin-card-head">
                <h2>{product.name}</h2>
                <select
                  value={product.availabilityStatus}
                  onChange={(event) =>
                    updateProduct(product.id, {
                      availabilityStatus: event.target.value as ProductAdmin["availabilityStatus"]
                    })
                  }
                >
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
              <label>
                Description
                <textarea
                  value={product.description}
                  rows={3}
                  onChange={(event) => updateProduct(product.id, { description: event.target.value })}
                />
              </label>
              <div className="variant-list">
                {product.variants.map((variant) => (
                  <div className="variant-row" key={variant.id}>
                    <strong>{variant.label}</strong>
                    <input
                      type="number"
                      min={0}
                      value={variant.priceInr}
                      onChange={(event) =>
                        updateVariant(product.id, variant.id, {
                          priceInr: Number(event.target.value)
                        })
                      }
                    />
                    <select
                      value={variant.availabilityStatus}
                      onChange={(event) =>
                        updateVariant(product.id, variant.id, {
                          availabilityStatus: event.target
                            .value as ProductVariantAdmin["availabilityStatus"]
                        })
                      }
                    >
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => saveProduct(product)} disabled={loading}>
                Save product
              </button>
            </article>
          ))}
        </section>
      ) : null}

      {tab === "orders" ? (
        <section className="admin-panel">
          <div className="order-filters">
            <input
              value={orderSearch}
              placeholder="Search name or 10 digit phone"
              onChange={(event) => setOrderSearch(event.target.value)}
            />
            <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button type="button" onClick={loadOrders}>
              Search
            </button>
          </div>
          <div className="order-list">
            {orders.map((order) => (
              <article className={`order-card ${order.status}`} key={order.id}>
                <div className="admin-card-head">
                  <div>
                    <h2>#{order.orderNumber} {order.customerName}</h2>
                    <p>{order.customerPhone} · {new Date(order.placedAt).toLocaleString()}</p>
                  </div>
                  <strong>{formatMoney(order.totalInr)}</strong>
                </div>
                <p>{order.customerAddress}</p>
                {order.customerNote ? <p>Note: {order.customerNote}</p> : null}
                <ul>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.productName} ({item.variantLabel}) x {item.quantity} -{" "}
                      {formatMoney(item.lineTotalInr)}
                    </li>
                  ))}
                </ul>
                <div className="order-actions">
                  <select
                    value={order.status}
                    onChange={(event) =>
                      updateOrderStatus(order.id, event.target.value as OrderAdmin["status"])
                    }
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <span>Email: {order.emailStatus}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "owner" && user.isOwner ? (
        <section className="admin-panel">
          <div className="order-filters">
            <input
              type="month"
              value={reportMonth}
              onChange={(event) => setReportMonth(event.target.value)}
            />
            <button type="button" onClick={loadOwnerReport}>
              Load report
            </button>
          </div>
          <div className="qr-panel">
            <h2>Store QR</h2>
            <p>Use this for shop posters after deployment URL is final.</p>
            {selectedStore ? (
              <img
                src={`/api/stores/${selectedStore.slug}/qr`}
                alt={`${selectedStore.name} QR code`}
                width={180}
                height={180}
              />
            ) : null}
          </div>
          <div className="report-table">
            {(report?.stores ?? []).map((store) => (
              <article className="admin-card" key={store.id}>
                <h2>{store.name}</h2>
                <p>Submitted: {store.submittedOrders}</p>
                <p>Completed: {store.completedOrders}</p>
                <p>Cancelled: {store.cancelledOrders}</p>
                <p>Completed value: {formatMoney(store.completedValueInr)}</p>
                <p>Commission due: {formatMoney(store.commissionDueInr)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

async function api<T>(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    }
  });
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}
