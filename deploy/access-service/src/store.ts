/**
 * Tiny JSON-file access store with atomic writes. One record per subscriber
 * email. Deliberately dependency-free — at early scale a flat file on a
 * mounted volume beats running a database, and it's trivially backed up.
 */
import { promises as fs } from "node:fs";
import { dirname } from "node:path";

export type AccessStatus = "active" | "trialing" | "past_due" | "revoked";

export interface AccessRecord {
  status: AccessStatus;
  customerId?: string;
  subscriptionId?: string;
  updatedAt: string;
}

export class Store {
  private data: Record<string, AccessRecord> = {};

  constructor(private path: string) {}

  private static key(email: string): string {
    return email.trim().toLowerCase();
  }

  async load(): Promise<void> {
    try {
      this.data = JSON.parse(await fs.readFile(this.path, "utf8"));
    } catch {
      this.data = {};
    }
  }

  get(email: string): AccessRecord | undefined {
    return this.data[Store.key(email)];
  }

  async set(email: string, rec: AccessRecord): Promise<void> {
    this.data[Store.key(email)] = rec;
    await fs.mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.data, null, 2));
    await fs.rename(tmp, this.path);
  }

  count(): number {
    return Object.keys(this.data).length;
  }
}
