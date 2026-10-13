/**
 * Create an API with default subdomain and one paid endpoint.
 *
 * Usage:
 *   export LAUNA_API_KEY=launa_live_...
 *   export LAUNA_BASE_URL=https://api.launa.io
 *   npx tsx examples/typescript/setup-api.ts [slug] [upstream-url] [price-usdc]
 */
import {
  LaunaClient,
  buildUsdcAccept,
  setupApiWithDefaultDomain,
  usdcToAtomic,
} from "@launaio/sdk";

const slug = process.argv[2] ?? "demo-api";
const upstream = process.argv[3] ?? "https://httpbin.org";
const price = process.argv[4] ?? "0.01";

const client = new LaunaClient({
  baseUrl: process.env.LAUNA_BASE_URL ?? "https://api.launa.io",
  apiKey: process.env.LAUNA_API_KEY!,
});

async function main() {
  if (!process.env.LAUNA_API_KEY) {
    throw new Error("LAUNA_API_KEY is required");
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
