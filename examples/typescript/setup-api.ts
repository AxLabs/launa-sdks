/**
 * Create an API with default subdomain and one paid endpoint.
 *
 * Usage:
 *   export AX402_API_KEY=ax402_live_...
 *   export AX402_BASE_URL=https://api.ax402.io
 *   npx tsx examples/typescript/setup-api.ts [slug] [upstream-url] [price-usdc]
 */
import {
  Ax402Client,
  buildUsdcAccept,
  setupApiWithDefaultDomain,
  usdcToAtomic,
} from "@ax402/sdk";

const slug = process.argv[2] ?? "demo-api";
const upstream = process.argv[3] ?? "https://httpbin.org";
const price = process.argv[4] ?? "0.01";

const client = new Ax402Client({
  baseUrl: process.env.AX402_BASE_URL ?? "https://api.ax402.io",
  apiKey: process.env.AX402_API_KEY!,
});

async function main() {
  if (!process.env.AX402_API_KEY) {
    throw new Error("AX402_API_KEY is required");
  }

  const { api, gatewayUrl } = await setupApiWithDefaultDomain(client, {
    name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    slug,
    upstream_base_url: upstream,
  });

  const endpoint = await client.endpoints.create(api.id, {
    method: "GET",
    path_pattern: "/get",
    description: "Paid echo via httpbin",
    accepts: [buildUsdcAccept("exact", usdcToAtomic(price))],
  });

  console.log(
    JSON.stringify(
      {
        apiId: api.id,
        slug: api.slug,
        endpointId: endpoint.id,
        gatewayUrl: `${gatewayUrl}/get`,
        priceUsdc: price,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
