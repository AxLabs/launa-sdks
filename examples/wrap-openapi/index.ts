import { readFileSync } from "node:fs";
import { Ax402Client, buildUsdcAccept, usdcToAtomic, wrapOpenAPI } from "@axlabs/ax402-sdk";

const [, , specPath, apiId, price = "0.10"] = process.argv;
if (!specPath || !apiId) {
  console.error("Usage: wrap-openapi <spec.yaml> <apiId> [price-usdc]");
  process.exit(2);
}

const client = new Ax402Client({
  baseUrl: process.env.AX402_BASE_URL ?? "http://api.localhost:8090",
  apiKey: process.env.AX402_API_KEY!,
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
