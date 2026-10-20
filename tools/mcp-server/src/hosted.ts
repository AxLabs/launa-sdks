#!/usr/bin/env node
import { createServer } from "node:http";
import { MongoClient } from "mongodb";
import { readConfig } from "./hosted/config.js";
import { SellerBackend } from "./hosted/backend.js";
import { MongoOAuthStore } from "./hosted/store.js";
import { OAuthService } from "./hosted/oauth.js";
import { createHttpHandler } from "./hosted/http.js";

async function main() {
  const config = readConfig(process.env);
  if (!process.env.MCP_MONGODB_URI || !process.env.MCP_MONGODB_DATABASE)
    throw new Error("MCP_MONGODB_URI and MCP_MONGODB_DATABASE required");
  const mongo = new MongoClient(process.env.MCP_MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
  });
  await mongo.connect();
  const store = new MongoOAuthStore(mongo.db(process.env.MCP_MONGODB_DATABASE));
  await store.initialize();
  const oauth = new OAuthService(config, store, new SellerBackend(config));
  const server = createServer(
    { maxHeaderSize: 16_384, requestTimeout: 35_000, headersTimeout: 10_000 },
    createHttpHandler(config, oauth),
  );
  server.listen(
    Number(process.env.PORT ?? 3001),
    process.env.HOST ?? "127.0.0.1",
    () => console.error("Launa hosted MCP listening"),
  );
  const shutdown = () => {
    server.close(() => {
      void mongo.close().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
main().catch(() => {
  console.error(
    "Hosted MCP startup failed; check configuration and database connectivity",
  );
  process.exit(1);
});
