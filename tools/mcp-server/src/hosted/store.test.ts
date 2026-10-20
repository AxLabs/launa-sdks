import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { MongoOAuthStore } from "./store.js";

const uri = process.env.MCP_TEST_MONGODB_URI;
// Opt-in local integration only. Never accept an application DB name or remote URI.
const local = uri && /^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(uri);
if (uri && !local)
  throw new Error(
    "MCP_TEST_MONGODB_URI must be a loopback Mongo URI with no database or options",
  );

describe.skipIf(!local)("Mongo OAuth persistence", () => {
  const dbName = `launa_mcp_test_${randomUUID().replaceAll("-", "")}`;
  let mongo: MongoClient;
  let store: MongoOAuthStore;
  beforeAll(async () => {
    mongo = new MongoClient(uri!, { serverSelectionTimeoutMS: 5_000 });
    await mongo.connect();
    store = new MongoOAuthStore(mongo.db(dbName));
    await store.initialize();
  });
  afterAll(async () => {
    if (mongo) {
      await mongo.db(dbName).dropDatabase();
      await mongo.close();
    }
  });
  it("claims a code atomically across service instances and retains reuse evidence", async () => {
    await store.put({
      id: "test-hash",
      kind: "code",
      value: { grantId: "test-grant" },
      used: false,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const peer = new MongoOAuthStore(mongo.db(dbName));
    const claims = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        (i % 2 ? peer : store).consume("test-hash", "code"),
      ),
    );
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect((await peer.get("test-hash", "code"))?.used).toBe(true);
    expect(await peer.consume("test-hash", "code")).toBeNull();
  });
  it("enforces expiry before Mongo's asynchronous TTL cleanup", async () => {
    await store.put({
      id: "expired",
      kind: "access",
      value: {},
      used: false,
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await store.get("expired", "access")).toBeNull();
    expect(await store.consume("expired", "access")).toBeNull();
  });
  it("persists across reconnections and immediately observes grant deletion", async () => {
    await store.put({
      id: "grant",
      kind: "grant",
      value: { userId: "test-user" },
      used: false,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const second = await new MongoClient(uri!).connect();
    try {
      const peer = new MongoOAuthStore(second.db(dbName));
      expect((await peer.get("grant", "grant"))?.value).toEqual({
        userId: "test-user",
      });
      await peer.remove("grant", "grant");
      expect(await store.get("grant", "grant")).toBeNull();
      const indexes = await second.db(dbName).collection("mcp_oauth").indexes();
      expect(indexes.some((i) => i.expireAfterSeconds === 0)).toBe(true);
      expect(
        indexes.some((i) => i.unique && i.key.id === 1 && i.key.kind === 1),
      ).toBe(true);
    } finally {
      await second.close();
    }
  });
});
