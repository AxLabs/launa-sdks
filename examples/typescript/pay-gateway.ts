/**
 * Pay a gateway URL with an EVM wallet (exact or batch-settlement).
 *
 * Usage:
 *   export LAUNA_EVM_PRIVATE_KEY=0x...
 *   npx tsx examples/typescript/pay-gateway.ts [gateway-url]
 *
 * Batch-settlement gateway:
 *   npx tsx examples/typescript/pay-gateway.ts --batch [gateway-url]
 */
import { buyerClientFromEnv } from "@axlabs/ax402-sdk/buyer";

const args = process.argv.slice(2);
const batch = args[0] === "--batch";
const url =
  (batch ? args[1] : args[0]) ??
  "https://my-api.launa.io/v1/echo?test=1";

async function main() {
  const client = await buyerClientFromEnv(batch ? { batch: { depositMultiplier: 5 } } : {});
  const { response, payment } = await client.pay({ url });

  const body = await response.text();
  console.log(
    JSON.stringify(
      {
        status: response.status,
        url,
        batch,
        payment: payment ?? null,
        body: body.slice(0, 500),
      },
      null,
      2,
    ),
  );

  if (response.status >= 400) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
