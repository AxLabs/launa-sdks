import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer, type RequestListener } from "node:http";

const fixtures = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "responses.json"), "utf8"),
);

export type MockRoute = {
  method: string;
  path: string;
  status?: number;
  body?: unknown;
  empty?: boolean;
  requireAuth?: boolean;
};

export const MOCK_ROUTES: MockRoute[] = [
  { method: "POST", path: "/auth/signup", status: 201, body: fixtures.authResponse, requireAuth: false },
  { method: "POST", path: "/auth/login", body: fixtures.authResponse, requireAuth: false },
  { method: "POST", path: "/auth/logout", body: fixtures.statusOk, requireAuth: false },
  { method: "POST", path: "/auth/verify-email", body: { status: "verified" }, requireAuth: false },
  { method: "GET", path: "/auth/me", body: fixtures.user },
  { method: "POST", path: "/auth/resend-verification", body: { status: "sent" } },
  { method: "POST", path: "/auth/forgot-password", body: { status: "sent" }, requireAuth: false },
  { method: "POST", path: "/auth/reset-password", body: { status: "ok" }, requireAuth: false },
  { method: "PUT", path: "/auth/password", body: fixtures.statusOk },
  { method: "POST", path: "/auth/onboarding/complete", body: { ...fixtures.user, onboarding_completed: true } },
  { method: "GET", path: "/auth/scopes", body: fixtures.scopes },
  { method: "GET", path: "/auth/api-keys", body: [fixtures.apiKey] },
  { method: "POST", path: "/auth/api-keys", status: 201, body: fixtures.createdApiKey },
  { method: "DELETE", path: "/auth/api-keys/key1", body: { status: "revoked" } },
  { method: "GET", path: "/config/platform", body: fixtures.platformConfig, requireAuth: false },
  { method: "GET", path: "/domains/suggest", body: fixtures.domainPlan },
  { method: "GET", path: "/supported-networks", body: fixtures.supportedNetworks },
  { method: "GET", path: "/stats/overview", body: fixtures.statsOverview },
  { method: "GET", path: "/exchange-rates", body: fixtures.exchangeRatesAll },
  { method: "GET", path: "/exchange-rates/supported", body: fixtures.exchangeRatesSupported },
  { method: "POST", path: "/openapi/parse", body: fixtures.parsedOpenAPI },
  { method: "GET", path: "/apis", body: [fixtures.api] },
  { method: "POST", path: "/apis", status: 201, body: fixtures.api },
  { method: "GET", path: "/apis/api1", body: fixtures.api },
  { method: "PUT", path: "/apis/api1", body: fixtures.api },
  { method: "DELETE", path: "/apis/api1", status: 204, empty: true },
  { method: "GET", path: "/apis/api1/cors", body: fixtures.apiCors },
  { method: "PUT", path: "/apis/api1/cors", body: fixtures.apiCors },
  { method: "POST", path: "/apis/api1/cors", body: fixtures.apiCors },
  { method: "DELETE", path: "/apis/api1/cors", body: fixtures.apiCors },
  { method: "GET", path: "/apis/api1/endpoints", body: [fixtures.endpoint] },
  { method: "POST", path: "/apis/api1/endpoints", status: 201, body: fixtures.endpoint },
  { method: "PUT", path: "/apis/api1/endpoints/ep1", body: fixtures.endpoint },
  { method: "DELETE", path: "/apis/api1/endpoints/ep1", status: 204, empty: true },
  { method: "POST", path: "/apis/api1/openapi/import", body: fixtures.importResult },
  { method: "GET", path: "/apis/api1/domains", body: [fixtures.domainSetup] },
  { method: "POST", path: "/apis/api1/domains", status: 201, body: fixtures.domainSetup },
  { method: "POST", path: "/apis/api1/domains/dom1/verify", body: { status: "verified" } },
  { method: "DELETE", path: "/apis/api1/domains/dom1", status: 204, empty: true },
  { method: "GET", path: "/apis/api1/stats", body: fixtures.statsOverview },
  { method: "GET", path: "/apis/api1/settlements", body: fixtures.settlements },
  { method: "GET", path: "/apis/api1/webhook-deliveries", body: fixtures.webhookDeliveries ?? [] },
  { method: "GET", path: "/apis/api1/batch-settlements", body: fixtures.batchSettlements },
  { method: "DELETE", path: "/auth/me", status: 204, empty: true },
  { method: "GET", path: "/auth/me/notifications", body: fixtures.notificationPreferences },
  { method: "PATCH", path: "/auth/me/notifications", body: fixtures.notificationPreferences },
  { method: "GET", path: "/sandbox-wallet", body: fixtures.sandboxWallet },
  { method: "POST", path: "/sandbox-wallet/reset", body: fixtures.sandboxWallet },
  { method: "GET", path: "/config/local-dev", body: fixtures.localDevConfig },
  { method: "GET", path: "/billing", body: fixtures.billingOverview },
  { method: "POST", path: "/billing/model", body: fixtures.billingOverview },
  { method: "GET", path: "/income/summary", body: fixtures.incomeSummary },
  { method: "GET", path: "/income/payout-requests", body: [fixtures.payoutRequest] },
  { method: "POST", path: "/income/payout-requests", status: 201, body: fixtures.payoutRequest },
  { method: "DELETE", path: "/income/payout-requests/payout1", status: 204, empty: true },
];

function matchPath(pattern: string, actual: string): boolean {
  const re = new RegExp("^" + pattern.replace(/\{[^/]+\}/g, "[^/]+") + "$");
  return re.test(actual.split("?")[0] ?? actual);
}

export function createMockHandler(): RequestListener {
  return (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? "/";
    const path = url.split("?")[0] ?? url;
    const route = MOCK_ROUTES.find(
      (r) => r.method === req.method && matchPath(r.path, path),
    );
    if (!route) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
      return;
    }
    if (route.requireAuth !== false) {
      const auth = req.headers.authorization ?? req.headers["x-api-key"];
      if (!auth) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "unauthorized" }));
        return;
      }
    }
    res.writeHead(route.status ?? 200, { "Content-Type": "application/json" });
    if (route.empty) {
      res.end();
      return;
    }
    res.end(JSON.stringify(route.body ?? {}));
  };
}

export function startMockServer(): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = createServer(createMockHandler());
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((r, j) => server.close((e) => (e ? j(e) : r()))),
      });
    });
  });
}

export { fixtures };
