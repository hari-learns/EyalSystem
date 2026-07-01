import { Resend } from "resend";
import { formatMoney } from "@/lib/money";

export type OrderEmailStore = {
  name: string;
  merchantOrderEmail: string | null;
};

export type OrderEmailOrder = {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerNote: string | null;
  totalInr: number;
};

export type OrderEmailItem = {
  productName: string;
  variantLabel: string;
  priceInr: number;
  rateDisplayMode?: "fixed" | "on_call";
  quantity: number;
  lineTotalInr: number;
};

type SendOrderEmailInput = {
  store: OrderEmailStore;
  order: OrderEmailOrder;
  items: OrderEmailItem[];
};

type SendOrderEmailResult =
  | { ok: true; emailId: string | null }
  | { ok: false; error: string };

let resendClient: Resend | null = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  resendClient ??= new Resend(apiKey);
  return resendClient;
}

export async function sendMerchantOrderEmail({
  store,
  order,
  items
}: SendOrderEmailInput): Promise<SendOrderEmailResult> {
  const resend = getResendClient();

  if (!resend) {
    return { ok: false, error: "Missing RESEND_API_KEY." };
  }

  const to = store.merchantOrderEmail || process.env.ORDER_EMAIL_TO;
  const from = process.env.ORDER_EMAIL_FROM || "Eyal Orders <onboarding@resend.dev>";

  if (!to) {
    return { ok: false, error: "Missing merchant order email recipient." };
  }

  const { data, error } = await resend.emails.send(
    {
      from,
      to,
      subject: `${store.name} order #${order.orderNumber}`,
      html: renderOrderEmailHtml({ store, order, items }),
      text: renderOrderEmailText({ store, order, items })
    },
    {
      headers: {
        "Idempotency-Key": `merchant-order-${order.id}`
      }
    }
  );

  if (error) {
    return { ok: false, error: formatEmailError(error) };
  }

  return { ok: true, emailId: data?.id ?? null };
}

function renderOrderEmailHtml({ store, order, items }: SendOrderEmailInput) {
  const itemRows = items
    .map(
      (item) => {
        const amount =
          item.rateDisplayMode === "on_call" ? "Rate on call" : formatMoney(item.lineTotalInr);

        return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eadfc9;">
            <strong>${escapeHtml(item.productName)}</strong><br />
            <span style="color:#6e6253;">${escapeHtml(item.variantLabel)} x ${item.quantity}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #eadfc9;text-align:right;">
            ${escapeHtml(amount)}
          </td>
        </tr>
      `;
      }
    )
    .join("");
  const hasOnCallItems = items.some((item) => item.rateDisplayMode === "on_call");

  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f5efe3;color:#2b1d12;font-family:Arial,sans-serif;">
        <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
          <div style="background:#fffaf0;border:1px solid #e1cfaa;border-radius:18px;padding:24px;">
            <p style="margin:0 0 6px;color:#6f7f42;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">New order</p>
            <h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:30px;line-height:1.12;">${escapeHtml(
              store.name
            )} #${order.orderNumber}</h1>
            <table style="width:100%;border-collapse:collapse;font-size:15px;">
              <tr><td style="padding:5px 0;color:#6e6253;">Customer</td><td style="padding:5px 0;text-align:right;"><strong>${escapeHtml(
                order.customerName
              )}</strong></td></tr>
              <tr><td style="padding:5px 0;color:#6e6253;">Phone</td><td style="padding:5px 0;text-align:right;"><strong>${escapeHtml(
                order.customerPhone
              )}</strong></td></tr>
              <tr><td style="padding:5px 0;color:#6e6253;">Address</td><td style="padding:5px 0;text-align:right;">${escapeHtml(
                order.customerAddress
              )}</td></tr>
            </table>
            ${
              order.customerNote
                ? `<div style="margin:18px 0;padding:12px 14px;background:#f3ead8;border-radius:12px;"><strong>Note:</strong> ${escapeHtml(
                    order.customerNote
                  )}</div>`
                : ""
            }
            <h2 style="margin:24px 0 8px;font-size:18px;">Items</h2>
            <table style="width:100%;border-collapse:collapse;font-size:15px;">${itemRows}</table>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:22px;padding-top:18px;border-top:2px solid #2b1d12;">
              <span style="font-size:16px;color:#6e6253;">${hasOnCallItems ? "Known subtotal" : "Total"}</span>
              <strong style="font-size:24px;">${escapeHtml(formatMoney(order.totalInr))}</strong>
            </div>
            ${
              hasOnCallItems
                ? `<p style="margin:12px 0 0;color:#6e6253;">Some item rates are marked rate on call. Confirm final total with the customer before payment.</p>`
                : ""
            }
          </div>
        </div>
      </body>
    </html>
  `;
}

function renderOrderEmailText({ store, order, items }: SendOrderEmailInput) {
  const lines = items
    .map(
      (item) => {
        const amount =
          item.rateDisplayMode === "on_call" ? "Rate on call" : formatMoney(item.lineTotalInr);
        return `- ${item.productName} (${item.variantLabel}) x ${item.quantity}: ${amount}`;
      }
    )
    .join("\n");
  const hasOnCallItems = items.some((item) => item.rateDisplayMode === "on_call");

  return [
    `New order for ${store.name} #${order.orderNumber}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.customerPhone}`,
    `Address: ${order.customerAddress}`,
    order.customerNote ? `Note: ${order.customerNote}` : null,
    "",
    "Items:",
    lines,
    "",
    `${hasOnCallItems ? "Known subtotal" : "Total"}: ${formatMoney(order.totalInr)}`,
    hasOnCallItems ? "Some item rates are marked rate on call. Confirm final total before payment." : null
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatEmailError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : JSON.stringify(error);
  }

  return String(error);
}
