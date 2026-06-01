import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Ax402Client, buildUsdcAccept, usdcToAtomic } from "@axlabs/ax402-sdk";

function ax402Client() {
  return new Ax402Client({
    baseUrl: process.env.AX402_BASE_URL ?? "http://api.localhost:8090",
    apiKey: process.env.AX402_API_KEY,
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  const client = ax402Client();
  const apis = await client.apis.list();
  return json({ apis });
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const apiId = String(form.get("apiId") ?? "");
  const productId = String(form.get("productId") ?? "");
  const priceUsdc = String(form.get("priceUsdc") ?? "0.10");
  const client = ax402Client();
  const endpoint = await client.endpoints.create(apiId, {
    method: "GET",
    path_pattern: `/products/${productId}`,
    accepts: [buildUsdcAccept("exact", usdcToAtomic(priceUsdc))],
  });
  return json({ endpoint });
}

export default function Index() {
  const { apis } = useLoaderData<typeof loader>();
  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Ax402 Shopify</h1>
      <p>Link a product to a paid gateway endpoint.</p>
      <form method="post">
        <label>
          API ID
          <input name="apiId" defaultValue={apis[0]?.id ?? ""} />
        </label>
        <label>
          Product ID
          <input name="productId" />
        </label>
        <label>
          Price (USDC)
          <input name="priceUsdc" defaultValue="0.10" />
        </label>
        <button type="submit">Create endpoint</button>
      </form>
    </div>
  );
}
