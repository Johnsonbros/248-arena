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
  /** How this record came to exist: "stripe" (default) or "scholarship". */
  source?: string;
  /** Scholarship seats expire; Stripe records never carry this (webhooks own
   *  their lifecycle). Past this instant the record no longer grants access. */
  expiresAt?: string;
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

  private async persist(): Promise<void> {
    await fs.mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.data, null, 2));
    await fs.rename(tmp, this.path);
  }

  get(email: string): AccessRecord | undefined {
    return this.data[Store.key(email)];
  }

  async set(email: string, rec: AccessRecord): Promise<void> {
    this.data[Store.key(email)] = rec;
    await this.persist();
  }

  async delete(email: string): Promise<void> {
    delete this.data[Store.key(email)];
    await this.persist();
  }

  /** Find the email key of a record matching a Stripe customer/subscription id —
   *  lets lifecycle events revoke the right record even if the customer's email
   *  changed after checkout. */
  findKeyByIds(customerId?: string | null, subscriptionId?: string | null): string | undefined {
    if (!customerId && !subscriptionId) return undefined;
    return Object.keys(this.data).find((k) => {
      const r = this.data[k];
      return (!!customerId && r.customerId === customerId) || (!!subscriptionId && r.subscriptionId === subscriptionId);
    });
  }

  count(): number {
    return Object.keys(this.data).length;
  }
}

/** Generic keyed JSON store (same atomic-write pattern) for progress records. */
export class JsonMap<T> {
  private data: Record<string, T> = {};

  constructor(private path: string) {}

  async load(): Promise<void> {
    try {
      this.data = JSON.parse(await fs.readFile(this.path, "utf8"));
    } catch {
      this.data = {};
    }
  }

  private async persist(): Promise<void> {
    await fs.mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.data));
    await fs.rename(tmp, this.path);
  }

  get(key: string): T | undefined {
    return this.data[key.trim().toLowerCase()];
  }

  async set(key: string, value: T): Promise<void> {
    this.data[key.trim().toLowerCase()] = value;
    await this.persist();
  }

  entries(): Array<[string, T]> {
    return Object.entries(this.data);
  }

  count(): number {
    return Object.keys(this.data).length;
  }
}

/** Capped JSON list (newest kept) for score submissions. */
export class JsonList<T> {
  private data: T[] = [];

  constructor(private path: string, private cap = 5000) {}

  async load(): Promise<void> {
    try {
      this.data = JSON.parse(await fs.readFile(this.path, "utf8"));
      if (!Array.isArray(this.data)) this.data = [];
    } catch {
      this.data = [];
    }
  }

  private async persist(): Promise<void> {
    await fs.mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.data));
    await fs.rename(tmp, this.path);
  }

  async push(item: T): Promise<void> {
    this.data.push(item);
    if (this.data.length > this.cap) this.data = this.data.slice(-this.cap);
    await this.persist();
  }

  all(): readonly T[] {
    return this.data;
  }

  count(): number {
    return this.data.length;
  }
}
