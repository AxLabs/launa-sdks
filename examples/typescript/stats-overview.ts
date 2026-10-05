/**
 * List APIs and print platform stats for the last N days.
 *
 * Usage:
 *   export LAUNA_API_KEY=launa_live_...
 *   npx tsx examples/typescript/stats-overview.ts [days]
 */
import { LaunaClient } from "@launa/sdk";

const days = Number.parseInt(process.argv[2] ?? "30", 10);

const client = new LaunaClient({
  baseUrl: process.env.LAUNA_BASE_URL ?? "https://api.launa.io",
  apiKey: process.env.LAUNA_API_KEY!,
});

async function main() {
  if (!process.env.LAUNA_API_KEY) {
    throw new Error("LAUNA_API_KEY is required");
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
