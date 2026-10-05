export type Session = {
  id: string;
  shop: string;
  accessToken: string;
  launaCredentials?: string;
};

const sessions = new Map<string, Session>();

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function saveSession(session: Session): void {
  sessions.set(session.id, session);
}

export function oauthAuthorizeUrl(shop: string, redirectUri: string): string {
  return `https://${shop}/admin/oauth/authorize?client_id=dev&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export function exchangeCode(_shop: string, code: string): Session {
  const session: Session = {
    id: `offline_${code}`,
    shop: process.env.SHOPIFY_DEV_SHOP ?? "demo.myshopify.com",
    accessToken: "shpat_test",
  };
  saveSession(session);
  return session;
}
