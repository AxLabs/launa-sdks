/**
 * List APIs and print platform stats for the last N days.
 *
 * Usage:
 *   export AX402_API_KEY=ax402_live_...
 *   npx tsx examples/typescript/stats-overview.ts [days]
 */
import { Ax402Client } from "@axlabs/ax402-sdk";

const days = Number.parseInt(process.argv[2] ?? "30", 10);

const client = new Ax402Client({
  baseUrl: process.env.AX402_BASE_URL ?? "https://api.ax402.io",
  apiKey: process.env.AX402_API_KEY!,
});

async function main() {
  if (!process.env.AX402_API_KEY) {
    throw new Error("AX402_API_KEY is required");
  }

  const [apis, overview, rates] = await Promise.all([
    client.apis.list(),
    client.stats.overview(days),
    client.exchangeRates.supported(),
  ]);

  console.log(
    JSON.stringify(
      {
        days,
        apiCount: apis.length,
        apis: apis.map((a) => ({ id: a.id, slug: a.slug, name: a.name })),
        stats: overview,
        exchangeRates: rates,
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
