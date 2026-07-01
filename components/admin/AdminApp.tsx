"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { formatMoney } from "@/lib/money";

type AdminStore = {
  id: string;
  slug: string;
  name: string;
  role: string;
  merchantOrderEmail: string | null;
};

type AdminUser = {
  email: string;
  isOwner: boolean;
  stores: AdminStore[];
};

type AdminEmailConfig = {
  fallbackConfigured: boolean;
  fromConfigured: boolean;
};

type ProductVariantAdmin = {
  id: string;
  label: string;
  unitValue: number;
  priceInr: number;
  rateDisplayMode: "fixed" | "on_call";
  availabilityStatus: "available" | "unavailable";
};

type ProductAdmin = {
  id: string;
  name: string;
  shortName: string;
  categorySlug: string;
  categoryName: string;
  imagePath: string | null;
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
    priceInr: number;
    rateDisplayMode: "fixed" | "on_call";
    quantity: number;
    lineTotalInr: number;
  }[];
};

type OrdersResponse = {
  orders: OrderAdmin[];
  months: string[];
};

type Tab = "products" | "orders" | "store";

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

type AdminAppProps = {
  initialStoreSlug?: string;
};

export function AdminApp({ initialStoreSlug }: AdminAppProps) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [emailConfig, setEmailConfig] = useState<AdminEmailConfig | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedStoreSlug, setSelectedStoreSlug] = useState("");
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [savedProducts, setSavedProducts] = useState<ProductAdmin[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderAdmin[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderMonths, setOrderMonths] = useState<string[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedStore = useMemo(
    () => user?.stores.find((store) => store.slug === selectedStoreSlug) ?? null,
    [selectedStoreSlug, user]
  );
  const isStoreLocked = Boolean(initialStoreSlug);
  const dirtyProductIds = useMemo(() => {
    const savedById = new Map(savedProducts.map((product) => [product.id, product]));
    return new Set(
      products
        .filter((product) => JSON.stringify(product) !== JSON.stringify(savedById.get(product.id)))
        .map((product) => product.id)
    );
  }, [products, savedProducts]);
  const hasDirtyProducts = dirtyProductIds.size > 0;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const visibleOrderMonths = orderMonths.length > 0 ? orderMonths : [currentMonth];
  const normalizedProductSearch = productSearch.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    if (!normalizedProductSearch) return products;

    return products.filter((product) =>
      [
        product.name,
        product.shortName,
        product.categoryName,
        product.description,
        ...product.variants.map((variant) => variant.label)
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedProductSearch)
    );
  }, [normalizedProductSearch, products]);
  const productsByCategory = useMemo(() => {
    const grouped = new Map<string, ProductAdmin[]>();

    for (const product of filteredProducts) {
      const key = product.categoryName || "Uncategorized";
      grouped.set(key, [...(grouped.get(key) ?? []), product]);
    }

    return Array.from(grouped.entries());
  }, [filteredProducts]);

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
    if (tab === "store") void loadOrders();
  }, [accessToken, selectedStore?.slug, tab, reportMonth]);

  useEffect(() => {
    if (!hasDirtyProducts) return;

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasDirtyProducts]);

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
    if (hasDirtyProducts && !window.confirm("Unsaved product changes will be lost if you sign out.")) {
      return;
    }

    await supabase?.auth.signOut();
    setAccessToken(null);
    setUser(null);
    setProducts([]);
    setSavedProducts([]);
    setOrders([]);
  }

  async function loadMe(token = accessToken) {
    if (!token) return;
    const payload = await api<{ user: AdminUser; email: AdminEmailConfig }>("/api/admin/me", token);
    setUser(payload.user);
    setEmailConfig(payload.email);
    setSelectedStoreSlug(initialStoreSlug ?? payload.user.stores[0]?.slug ?? "");
  }

  async function loadProducts() {
    if (!accessToken || !selectedStore) return;
    const payload = await api<{ products: ProductAdmin[] }>(
      `/api/admin/products?storeSlug=${encodeURIComponent(selectedStore.slug)}`,
      accessToken
    );
    setProducts(payload.products);
    setSavedProducts(payload.products);
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
          name: product.name,
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
    const params = new URLSearchParams({ storeSlug: selectedStore.slug, month: reportMonth });
    if (orderSearch.trim()) params.set("search", orderSearch.trim());
    if (orderStatus) params.set("status", orderStatus);

    const payload = await api<OrdersResponse>(
      `/api/admin/orders?${params.toString()}`,
      accessToken
    );
    setOrders(payload.orders);
    setOrderMonths(payload.months.length > 0 ? payload.months : [reportMonth]);
  }

  async function updateOrderStatus(orderId: string, status: "new" | "delivered" | "cancelled") {
    if (!accessToken || !selectedStore) return;
    await api("/api/admin/orders", accessToken, {
      method: "PATCH",
      body: JSON.stringify({ storeSlug: selectedStore.slug, orderId, status })
    });
    setMessage("Order status updated.");
    await loadOrders();
  }

  async function downloadMonthlyOrders() {
    if (!accessToken || !selectedStore) return;
    const params = new URLSearchParams({
      storeSlug: selectedStore.slug,
      month: reportMonth,
      format: "csv"
    });
    if (orderStatus) params.set("status", orderStatus);

    const response = await fetch(`/api/admin/orders?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      setMessage("Monthly report could not be downloaded.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedStore.slug}-${reportMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function updateProduct(productId: string, update: Partial<ProductAdmin>) {
    setProducts((current) =>
      current.map((product) => (product.id === productId ? { ...product, ...update } : product))
    );
  }

  function expandProduct(productId: string) {
    if (expandedProductId && dirtyProductIds.has(expandedProductId)) {
      const confirmed = window.confirm("Unsaved product changes will be lost if you close this editor.");
      if (!confirmed) return;
      const saved = savedProducts.find((product) => product.id === expandedProductId);
      if (saved) {
        setProducts((current) =>
          current.map((product) => (product.id === saved.id ? saved : product))
        );
      }
    }

    setExpandedProductId((current) => (current === productId ? null : productId));
  }

  function changeTab(nextTab: Tab) {
    if (nextTab === tab) return;

    if (hasDirtyProducts) {
      const confirmed = window.confirm("Unsaved product changes will be lost if you leave Products.");
      if (!confirmed) return;
      setProducts(savedProducts);
      setExpandedProductId(null);
    }

    setTab(nextTab);
  }

  function changeStore(nextStoreSlug: string) {
    if (nextStoreSlug === selectedStoreSlug) return;

    if (hasDirtyProducts) {
      const confirmed = window.confirm("Unsaved product changes will be lost if you switch stores.");
      if (!confirmed) return;
      setProducts(savedProducts);
      setExpandedProductId(null);
    }

    setSelectedStoreSlug(nextStoreSlug);
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

  if (!selectedStore) {
    return (
      <main className="admin-shell">
        <section className="admin-login">
          <p className="eyebrow">Merchant Portal</p>
          <h1>Store access denied</h1>
          <p>
            {initialStoreSlug
              ? `Your login does not have access to ${initialStoreSlug}.`
              : "Your login is not connected to a merchant store yet."}
          </p>
          <button type="button" onClick={logout}>
            Sign out
          </button>
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
        {isStoreLocked ? (
          <div>
            <span className="eyebrow">Store</span>
            <strong>{selectedStore.name}</strong>
          </div>
        ) : (
          <label>
            Store
            <select
              value={selectedStore.slug}
              onChange={(event) => changeStore(event.target.value)}
            >
              {user.stores.map((store) => (
                <option value={store.slug} key={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <nav className="admin-tabs">
          <button type="button" aria-pressed={tab === "products"} onClick={() => changeTab("products")}>
            Products
          </button>
          <button type="button" aria-pressed={tab === "orders"} onClick={() => changeTab("orders")}>
            Orders
          </button>
          <button type="button" aria-pressed={tab === "store"} onClick={() => changeTab("store")}>
            Store
          </button>
        </nav>
      </section>

      {message ? <p className="admin-message">{message}</p> : null}

      {tab === "products" ? (
        <section className="admin-panel">
          <div className="admin-list-tools">
            <label>
              Search products
              <input
                type="search"
                value={productSearch}
                placeholder="Search product, category, or size"
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </label>
            <p>{filteredProducts.length} products</p>
          </div>

          <div className="product-admin-list">
            {productsByCategory.map(([categoryName, categoryProducts]) => (
              <section className="admin-category-group" key={categoryName}>
                <h2>{categoryName}</h2>
                {categoryProducts.map((product) => {
                  const expanded = expandedProductId === product.id;
                  const dirty = dirtyProductIds.has(product.id);

                  return (
                    <article className={dirty ? "product-admin-row dirty" : "product-admin-row"} key={product.id}>
                      <button
                        className="product-row-summary"
                        type="button"
                        onClick={() => expandProduct(product.id)}
                        aria-expanded={expanded}
                      >
                        <img src={product.imagePath ?? "/images/coconut.jpg"} alt="" />
                        <span>
                          <strong>{product.name}</strong>
                          <small>{summarizeProductRates(product)}</small>
                        </span>
                        <em className={product.availabilityStatus}>{product.availabilityStatus}</em>
                      </button>

                      {expanded ? (
                        <div className="product-editor">
                          <label>
                            Product name
                            <input
                              value={product.name}
                              onChange={(event) => updateProduct(product.id, { name: event.target.value })}
                            />
                          </label>
                          <label>
                            Description
                            <textarea
                              value={product.description}
                              rows={3}
                              onChange={(event) =>
                                updateProduct(product.id, { description: event.target.value })
                              }
                            />
                          </label>
                          <label>
                            Product status
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
                          </label>
                          <div className="variant-list">
                            {product.variants.map((variant) => (
                              <div className="variant-row" key={variant.id}>
                                <strong>{variant.label}</strong>
                                <select
                                  value={variant.rateDisplayMode}
                                  onChange={(event) =>
                                    updateVariant(product.id, variant.id, {
                                      rateDisplayMode: event.target.value as ProductVariantAdmin["rateDisplayMode"]
                                    })
                                  }
                                >
                                  <option value="fixed">Fixed rate</option>
                                  <option value="on_call">Rate on call</option>
                                </select>
                                <input
                                  type="number"
                                  min={0}
                                  value={variant.priceInr}
                                  aria-label={`${variant.label} rate`}
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
                          {dirty ? (
                            <button type="button" onClick={() => saveProduct(product)} disabled={loading}>
                              {loading ? "Saving..." : "Save changes"}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "orders" ? (
        <section className="admin-panel">
          <div className="order-filters">
            <select value={reportMonth} onChange={(event) => setReportMonth(event.target.value)}>
              {visibleOrderMonths.map((month) => (
                <option value={month} key={month}>
                  {formatMonth(month)}
                </option>
              ))}
            </select>
            <input
              value={orderSearch}
              placeholder="Search name or 10 digit phone"
              onChange={(event) => setOrderSearch(event.target.value)}
            />
            <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="new">New</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button type="button" onClick={loadOrders}>
              Search
            </button>
            <button type="button" onClick={downloadMonthlyOrders}>
              Download CSV
            </button>
          </div>
          <div className="order-list">
            {orders.map((order) => {
              const expanded = expandedOrderId === order.id;
              const statusLabel = getMerchantOrderStatus(order.status);

              return (
                <article className={`order-card ${statusLabel}`} key={order.id}>
                  <button
                    className="order-row-summary"
                    type="button"
                    onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                    aria-expanded={expanded}
                  >
                    <span>
                      <strong>#{order.orderNumber} {order.customerName}</strong>
                      <small>{order.customerPhone} · {new Date(order.placedAt).toLocaleString()}</small>
                    </span>
                    <span>{formatMoney(order.totalInr)}</span>
                    <em>{statusLabel}</em>
                  </button>

                  {expanded ? (
                    <div className="order-detail">
                      <p>{order.customerAddress}</p>
                      {order.customerNote ? <p>Note: {order.customerNote}</p> : null}
                      <ul>
                        {order.items.map((item) => (
                          <li key={item.id}>
                            {item.productName} ({item.variantLabel}) x {item.quantity} -{" "}
                            {item.rateDisplayMode === "on_call"
                              ? "Rate on call"
                              : formatMoney(item.lineTotalInr)}
                          </li>
                        ))}
                      </ul>
                      <div className="order-actions">
                        <select
                          value={statusLabel}
                          onChange={(event) =>
                            updateOrderStatus(
                              order.id,
                              event.target.value as "new" | "delivered" | "cancelled"
                            )
                          }
                        >
                          <option value="new">New</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <span>
                          Email: {order.emailStatus}
                          {order.emailError ? ` - ${order.emailError}` : ""}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {tab === "store" ? (
        <section className="admin-panel">
          <div className="qr-panel">
            <h2>Store QR</h2>
            <p>Use this QR for shop posters and counter displays.</p>
            {selectedStore ? (
              <img
                src={`/api/stores/${selectedStore.slug}/qr`}
                alt={`${selectedStore.name} QR code`}
                width={180}
                height={180}
              />
            ) : null}
          </div>
          <div className="store-info-grid">
            <article className="admin-card">
              <h2>Email delivery</h2>
              {selectedStore.merchantOrderEmail ? (
                <p>Orders are sent to {selectedStore.merchantOrderEmail}.</p>
              ) : (
                <p>
                  Merchant email is not set. Orders are using the platform fallback email.
                  Configure a verified Resend domain before using a real merchant inbox.
                </p>
              )}
              <p>Fallback configured: {emailConfig?.fallbackConfigured ? "Yes" : "No"}</p>
              <p>Sender configured: {emailConfig?.fromConfigured ? "Yes" : "No"}</p>
            </article>
            <article className="admin-card">
              <h2>Monthly orders</h2>
              <label>
                Month
                <select value={reportMonth} onChange={(event) => setReportMonth(event.target.value)}>
                  {visibleOrderMonths.map((month) => (
                    <option value={month} key={month}>
                      {formatMonth(month)}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={downloadMonthlyOrders}>
                Download monthly CSV
              </button>
            </article>
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

function summarizeProductRates(product: ProductAdmin) {
  return product.variants
    .map((variant) =>
      variant.rateDisplayMode === "on_call"
        ? `${variant.label} Rate on call`
        : `${variant.label} ${formatMoney(variant.priceInr)}`
    )
    .join(" · ");
}

function formatMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${month}-01T00:00:00.000Z`));
}

function getMerchantOrderStatus(status: OrderAdmin["status"]) {
  if (status === "completed") return "delivered";
  if (status === "contacted") return "new";
  return status;
}
