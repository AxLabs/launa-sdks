import type { Collection, Db } from "mongodb";

export interface RecordValue {
  id: string;
  kind: string;
  value: unknown;
  expiresAt: Date;
  used: boolean;
}
export interface OAuthStore {
  put(record: RecordValue): Promise<void>;
  get(id: string, kind: string): Promise<RecordValue | null>;
  consume(id: string, kind: string): Promise<RecordValue | null>;
  remove(id: string, kind: string): Promise<void>;
}

/** One-use codes and refresh tokens are claimed atomically across all service replicas. */
export class MongoOAuthStore implements OAuthStore {
  private collection: Collection<RecordValue>;
  constructor(db: Db) {
    this.collection = db.collection<RecordValue>("mcp_oauth");
  }
  async initialize() {
    await this.collection.createIndex({ id: 1, kind: 1 }, { unique: true });
    await this.collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },
    );
  }
  async put(record: RecordValue) {
    await this.collection.insertOne(record);
  }
  async get(id: string, kind: string) {
    return this.collection.findOne({
      id,
      kind,
      expiresAt: { $gt: new Date() },
    });
  }
  async consume(id: string, kind: string) {
    return this.collection.findOneAndUpdate(
      { id, kind, used: false, expiresAt: { $gt: new Date() } },
      { $set: { used: true } },
      { returnDocument: "before" },
    );
  }
  async remove(id: string, kind: string) {
    await this.collection.deleteOne({ id, kind });
  }
}
