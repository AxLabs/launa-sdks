import { readFileSync } from "node:fs";
import { LaunaClient, buildUsdcAccept, usdcToAtomic, wrapOpenAPI } from "@axlabs/launa-sdk";

const [, , specPath, apiId, price = "0.10"] = process.argv;
if (!specPath || !apiId) {
  console.error("Usage: wrap-openapi <spec.yaml> <apiId> [price-usdc]");
  process.exit(2);
}

const client = new LaunaClient({
  baseUrl: process.env.LAUNA_BASE_URL ?? "http://api.localhost:8090",
  apiKey: process.env.LAUNA_API_KEY!,
});

async function main() {
  const spec = readFileSync(specPath, "utf8");
  const accepts = [buildUsdcAccept("exact", usdcToAtomic(price))];
  const result = await wrapOpenAPI(client, apiId, spec, accepts);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
