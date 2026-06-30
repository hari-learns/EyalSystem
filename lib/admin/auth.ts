type SupabaseAdminClient = any;

export type AdminUserContext = {
  userId: string;
  email: string;
  isOwner: boolean;
  stores: {
    id: string;
    slug: string;
    name: string;
    role: string;
  }[];
};

type UserClaims = {
  sub?: unknown;
  email?: unknown;
};

export function getOwnerEmails() {
  return (process.env.PLATFORM_OWNER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdminUserContext(
  ctx: { userClaims?: UserClaims | null },
  admin: SupabaseAdminClient
) {
  const userId = typeof ctx.userClaims?.sub === "string" ? ctx.userClaims.sub : "";
  const email = typeof ctx.userClaims?.email === "string" ? ctx.userClaims.email.toLowerCase() : "";

  if (!userId) {
    return { data: null, error: "Missing authenticated user." };
  }

  const { data, error } = await admin
    .from("merchant_users")
    .select(
      `
        role,
        stores!inner (
          id,
          slug,
          name
        )
      `
    )
    .eq("user_id", userId);

  if (error) {
    return { data: null, error: "Could not load merchant access." };
  }

  const stores = ((data ?? []) as any[]).flatMap((membership) => {
    const store = Array.isArray(membership.stores) ? membership.stores[0] : membership.stores;

    if (!store) return [];

    return [
      {
        id: store.id as string,
        slug: store.slug as string,
        name: store.name as string,
        role: membership.role as string
      }
    ];
  });

  const isOwner = email ? getOwnerEmails().includes(email) : false;

  return {
    data: {
      userId,
      email,
      isOwner,
      stores
    } satisfies AdminUserContext,
    error: null
  };
}

export function canAccessStore(user: AdminUserContext, storeSlug: string) {
  return user.isOwner || user.stores.some((store) => store.slug === storeSlug);
}

export function getStoreIdForSlug(user: AdminUserContext, storeSlug: string) {
  return user.stores.find((store) => store.slug === storeSlug)?.id ?? null;
}

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}
