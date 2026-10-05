import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { atomicToUsdc } from "@axlabs/ax402-sdk";
import { clientFromCredentials, createLaunaClient, getLaunaConfig } from "../launa.server.js";
import { loadCredentials, storeCredentials } from "../crypto.server.js";
import { endpointBuyerUrl, loadShopDashboard, monetizeProduct, onboardShop } from "../lib/shopify-actions.js";
import type { ProductPathKind } from "../lib/mapping.js";
import type { PaymentScheme } from "@axlabs/ax402-sdk";
import { listProducts } from "../lib/products.js";
import { getSession, saveSession } from "../shopify.server.js";

export async function loader({ request }: LoaderFunctionArgs) {
  const config = getLaunaConfig();
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session") ?? "offline_dev";
  const session = getSession(sessionId) ?? {
    id: sessionId,
    shop: process.env.SHOPIFY_DEV_SHOP ?? "demo.myshopify.com",
    accessToken: "shpat_test",
  };
  saveSession(session);

  let dashboard = null;
  if (session.launaCredentials) {
    const creds = loadCredentials(session.launaCredentials, config.encryptionSecret);
    const client = clientFromCredentials(creds, config.baseUrl);
    dashboard = await loadShopDashboard(client, creds);
  }

  return json({
    config: { baseUrl: config.baseUrl, devMode: config.devMode },
    sessionId: session.id,
    shop: session.shop,
    hasCredentials: Boolean(session.launaCredentials),
    dashboard,
    products: listProducts(config.devMode, session.shop, session.accessToken),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const config = getLaunaConfig();
  const form = await request.formData();
  const intent = String(form.get("intent"));
  const sessionId = String(form.get("sessionId"));
  const session = getSession(sessionId);
  if (!session) return json({ error: "Session not found. Open the app from Shopify admin or use ?session=offline_dev" }, { status: 400 });

  if (intent === "save-credentials") {
    const apiKey = String(form.get("apiKey") ?? "").trim();
    const apiId = String(form.get("apiId") ?? "").trim();
    if (!apiKey || !apiId) {
      return json({ error: "API key and API ID are required" }, { status: 400 });
    }
    session.launaCredentials = storeCredentials({ apiKey, apiId }, config.encryptionSecret);
    saveSession(session);
    return json({ ok: true, message: "Credentials saved" });
  }

  if (intent === "onboard") {
    const apiKey = String(form.get("apiKey") ?? "").trim();
    const payTo = String(form.get("payToAddress") ?? "").trim();
    if (!apiKey) return json({ error: "API key is required" }, { status: 400 });
    const client = createLaunaClient(apiKey, config.baseUrl);
    const result = await onboardShop(client, session.shop, payTo || undefined);
    session.launaCredentials = storeCredentials(
      { apiKey, apiId: result.apiId },
      config.encryptionSecret,
    );
    saveSession(session);
    return json({ ok: true, message: "Shop onboarded", onboard: result });
  }

  if (intent === "monetize") {
    if (!session.launaCredentials) {
      return json({ error: "Connect launa first" }, { status: 400 });
    }
    const creds = loadCredentials(session.launaCredentials, config.encryptionSecret);
    const client = clientFromCredentials(creds, config.baseUrl);
    const scheme = String(form.get("scheme") ?? "exact") as PaymentScheme;
    const pathKind = String(form.get("pathKind") ?? "rest-product") as ProductPathKind;
    const endpoint = await monetizeProduct(client, creds.apiId, {
      productId: String(form.get("productId")),
      priceUsdc: String(form.get("priceUsdc") ?? "0.10"),
      pathKind,
      scheme,
      description: String(form.get("productTitle") ?? ""),
    });
    return json({ ok: true, message: "Endpoint created", endpoint });
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

const fieldStyle = { display: "block", marginBottom: 8, width: "100%", maxWidth: 400 };
const sectionStyle = { marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid #e5e5e5" };

export default function AppIndex() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 800, lineHeight: 1.5 }}>
      <h1 style={{ marginTop: 0 }}>Launa × Shopify</h1>
      <p>
        Shop: <strong>{data.shop}</strong>
        {data.config.devMode ? " (dev mode — sample products)" : null}
      </p>

      {actionData && "error" in actionData ? (
        <p style={{ color: "#b00020", background: "#fde8e8", padding: 12, borderRadius: 6 }}>
          {actionData.error}
        </p>
      ) : null}
      {actionData && "message" in actionData ? (
        <p style={{ color: "#0d5c2e", background: "#e8f5ec", padding: 12, borderRadius: 6 }}>
          {actionData.message}
        </p>
      ) : null}

      <section style={sectionStyle}>
        <h2>Control plane</h2>
        <p>
          Base URL: <code>{data.config.baseUrl}</code> (set <code>LAUNA_BASE_URL</code> in .env)
        </p>
        <p style={{ fontSize: 14, color: "#555" }}>
          Use an API key with the SDK <code>apiManager</code> scope preset. Keys are encrypted at rest with{" "}
          <code>SHOPIFY_ENCRYPTION_SECRET</code>.
        </p>
      </section>

      {!data.hasCredentials ? (
        <section style={sectionStyle}>
          <h2>Connect launa</h2>
          <Form method="post" style={{ marginBottom: 24 }}>
            <input type="hidden" name="intent" value="save-credentials" />
            <input type="hidden" name="sessionId" value={data.sessionId} />
            <label style={fieldStyle}>
              API key
              <input name="apiKey" type="password" required autoComplete="off" style={{ width: "100%" }} />
            </label>
            <label style={fieldStyle}>
              Existing API ID
              <input name="apiId" required placeholder="From launa dashboard" style={{ width: "100%" }} />
            </label>
            <button type="submit">Save credentials</button>
          </Form>

          <h3>Or auto-onboard this shop</h3>
          <p style={{ fontSize: 14 }}>
            Creates an launa API with upstream <code>https://{data.shop}</code> and the default gateway subdomain.
          </p>
          <Form method="post">
            <input type="hidden" name="intent" value="onboard" />
            <input type="hidden" name="sessionId" value={data.sessionId} />
            <label style={fieldStyle}>
              API key
              <input name="apiKey" type="password" required autoComplete="off" style={{ width: "100%" }} />
            </label>
            <label style={fieldStyle}>
              Pay-to address (optional)
              <input name="payToAddress" placeholder="0x… — user_wallet mode" style={{ width: "100%" }} />
            </label>
            <button type="submit">Onboard shop</button>
          </Form>
        </section>
      ) : (
        <>
          {data.dashboard ? (
            <section style={sectionStyle}>
              <h2>Gateway</h2>
              <p>
                API: <strong>{data.dashboard.apiName}</strong> (<code>{data.dashboard.apiId}</code>)
              </p>
              <p>
                Buyer URL base:{" "}
                <a href={data.dashboard.gatewayUrl} target="_blank" rel="noreferrer">
                  {data.dashboard.gatewayUrl}
                </a>
              </p>
              {data.dashboard.endpoints.length > 0 ? (
                <>
                  <h3>Monetized endpoints</h3>
                  <ul style={{ paddingLeft: 20 }}>
                    {data.dashboard.endpoints.map((ep) => (
                      <li key={ep.id} style={{ marginBottom: 8 }}>
                        <code>
                          {ep.method} {ep.path_pattern}
                        </code>
                        {" — "}
                        {ep.accepts[0]?.amount
                          ? `${atomicToUsdc(ep.accepts[0].amount)} USDC (${ep.accepts[0].scheme})`
                          : "no price"}
                        <br />
                        <a href={endpointBuyerUrl(data.dashboard!, ep)} target="_blank" rel="noreferrer">
                          Open via gateway
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>No endpoints yet — monetize a product below.</p>
              )}
            </section>
          ) : null}

          <section style={sectionStyle}>
            <h2>Monetize products</h2>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {data.products.map((p) => (
                <li
                  key={p.id}
                  style={{
                    marginBottom: 16,
                    padding: 16,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                  }}
                >
                  <strong>{p.title}</strong> — store price ${p.price}
                  <Form method="post" style={{ marginTop: 12 }}>
                    <input type="hidden" name="intent" value="monetize" />
                    <input type="hidden" name="sessionId" value={data.sessionId} />
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="productTitle" value={p.title} />
                    <label style={{ ...fieldStyle, display: "inline-block", marginRight: 12, maxWidth: 120 }}>
                      USDC price
                      <input name="priceUsdc" defaultValue={p.price} />
                    </label>
                    <label style={{ ...fieldStyle, display: "inline-block", marginRight: 12, maxWidth: 200 }}>
                      Path
                      <select name="pathKind" defaultValue="rest-product">
                        <option value="rest-product">/products/:id</option>
                        <option value="storefront-product">/products/:id.json</option>
                      </select>
                    </label>
                    <label style={{ ...fieldStyle, display: "inline-block", marginRight: 12, maxWidth: 180 }}>
                      Scheme
                      <select name="scheme" defaultValue="exact">
                        <option value="exact">exact (instant)</option>
                        <option value="batch-settlement">batch-settlement</option>
                      </select>
                    </label>
                    <button type="submit" style={{ verticalAlign: "bottom" }}>
                      Create paid endpoint
                    </button>
                  </Form>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
