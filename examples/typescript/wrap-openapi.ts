/**
 * Import OpenAPI operations as paid gateway endpoints.
 *
 * Usage:
 *   export LAUNA_API_KEY=launa_live_...
 *   npx tsx examples/typescript/wrap-openapi.ts path/to/openapi.yaml YOUR_API_ID [price-usdc]
 */
import { readFileSync } from "node:fs";
import { LaunaClient, buildUsdcAccept, usdcToAtomic, wrapOpenAPI } from "@axlabs/launa-sdk";

const [, , specPath, apiId, price = "0.10"] = process.argv;
if (!specPath || !apiId) {
  console.error("Usage: wrap-openapi <spec.yaml> <apiId> [price-usdc]");
  process.exit(2);
}

const client = new LaunaClient({
  baseUrl: process.env.LAUNA_BASE_URL ?? "https://api.launa.io",
  apiKey: process.env.LAUNA_API_KEY!,
});

async function main() {
  if (!process.env.LAUNA_API_KEY) {
    throw new Error("LAUNA_API_KEY is required");
  }

  const spec = readFileSync(specPath, "utf8");
  const accepts = [buildUsdcAccept("exact", usdcToAtomic(price))];
  const result = await wrapOpenAPI(client, apiId, spec, accepts);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
