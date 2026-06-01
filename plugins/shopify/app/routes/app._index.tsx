import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Ax402Client } from "@axlabs/ax402-sdk";
import { loadCredentials, storeCredentials } from "../crypto.server.js";
import { getSession, saveSession } from "../shopify.server.js";
import { priceToAccept, productEndpointPath, shopUpstreamUrl } from "../lib/mapping.js";

function encryptionSecret() {
  return process.env.SHOPIFY_ENCRYPTION_SECRET ?? "dev-secret-change-me";
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session") ?? "offline_dev";
  const session = getSession(sessionId) ?? {
    id: sessionId,
    shop: "demo.myshopify.com",
    accessToken: "shpat_test",
  };
  saveSession(session);

  let apis: unknown[] = [];
  if (session.ax402Credentials) {
    const creds = loadCredentials(session.ax402Credentials, encryptionSecret());
    const client = new Ax402Client({
      baseUrl: process.env.AX402_BASE_URL ?? "http://api.localhost:8090",
      apiKey: creds.apiKey,
    });
    apis = await client.apis.list();
  }

  return json({
    sessionId: session.id,
    shop: session.shop,
    hasCredentials: Boolean(session.ax402Credentials),
    apis,
    products: [
      { id: "1001", title: "Sample product", price: "9.99" },
      { id: "1002", title: "Premium API access", price: "0.50" },
    ],
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent"));
  const sessionId = String(form.get("sessionId"));
  const session = getSession(sessionId);
  if (!session) return json({ error: "no session" }, { status: 400 });

  if (intent === "save-credentials") {
    const apiKey = String(form.get("apiKey"));
    const apiId = String(form.get("apiId"));
    session.ax402Credentials = storeCredentials({ apiKey, apiId }, encryptionSecret());
    saveSession(session);
    return json({ saved: true });
  }

  if (intent === "onboard") {
    const apiKey = String(form.get("apiKey"));
    const client = new Ax402Client({
      baseUrl: process.env.AX402_BASE_URL ?? "http://api.localhost:8090",
      apiKey,
    });
    const api = await client.apis.create({
      name: session.shop,
      slug: session.shop.replace(/\./g, "-"),
      upstream_base_url: shopUpstreamUrl(session.shop),
    });
    session.ax402Credentials = storeCredentials({ apiKey, apiId: api.id }, encryptionSecret());
    saveSession(session);
    return json({ api });
  }

  if (intent === "monetize") {
    const creds = loadCredentials(session.ax402Credentials!, encryptionSecret());
    const client = new Ax402Client({
      baseUrl: process.env.AX402_BASE_URL ?? "http://api.localhost:8090",
      apiKey: creds.apiKey,
    });
    const productId = String(form.get("productId"));
    const priceUsdc = String(form.get("priceUsdc") ?? "0.10");
    const endpoint = await client.endpoints.create(creds.apiId, {
      method: "GET",
      path_pattern: productEndpointPath(productId),
      accepts: [priceToAccept(priceUsdc)],
    });
    return json({ endpoint });
  }

  return json({ error: "unknown intent" }, { status: 400 });
}

export default function AppIndex() {
  const data = useLoaderData<typeof loader>();
  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 720 }}>
      <h1>Ax402 × Shopify</h1>
      <p>Shop: {data.shop}</p>
      {!data.hasCredentials ? (
        <>
          <h2>Connect ax402</h2>
          <Form method="post">
            <input type="hidden" name="intent" value="save-credentials" />
            <input type="hidden" name="sessionId" value={data.sessionId} />
            <label>
              API key
              <input name="apiKey" type="password" required />
            </label>
            <label>
              API ID
              <input name="apiId" required />
            </label>
            <button type="submit">Save</button>
          </Form>
          <Form method="post" style={{ marginTop: 16 }}>
            <input type="hidden" name="intent" value="onboard" />
            <input type="hidden" name="sessionId" value={data.sessionId} />
            <label>
              API key (auto-create API)
              <input name="apiKey" type="password" required />
            </label>
            <button type="submit">Onboard shop</button>
          </Form>
        </>
      ) : (
        <>
          <h2>Products</h2>
          <ul>
            {data.products.map((p) => (
              <li key={p.id} style={{ marginBottom: 12 }}>
                {p.title} (${p.price})
                <Form method="post" style={{ display: "inline", marginLeft: 8 }}>
                  <input type="hidden" name="intent" value="monetize" />
                  <input type="hidden" name="sessionId" value={data.sessionId} />
                  <input type="hidden" name="productId" value={p.id} />
                  <input type="hidden" name="priceUsdc" value={p.price} />
                  <button type="submit">Monetize</button>
                </Form>
              </li>
            ))}
          </ul>
          <p>
            Dashboard: link to ax402 stats for API{" "}
            {Array.isArray(data.apis) && data.apis[0] && typeof data.apis[0] === "object" && "id" in data.apis[0]
              ? String((data.apis[0] as { id: string }).id)
              : "(configured)"}
          </p>
        </>
      )}
    </div>
  );
}
