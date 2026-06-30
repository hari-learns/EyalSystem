import QRCode from "qrcode";

export const runtime = "nodejs";

type QrRouteProps = {
  params: Promise<{
    storeSlug: string;
  }>;
};

export async function GET(request: Request, { params }: QrRouteProps) {
  const { storeSlug } = await params;
  const origin = getPublicOrigin(request);
  const storeUrl = `${origin}/s/${storeSlug}`;
  const svg = await QRCode.toString(storeUrl, {
    type: "svg",
    margin: 2,
    width: 720,
    color: {
      dark: "#1b5e3f",
      light: "#fffaf0"
    }
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}

function getPublicOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (configured) {
    return configured.startsWith("http") ? configured : `https://${configured}`;
  }

  return new URL(request.url).origin;
}
