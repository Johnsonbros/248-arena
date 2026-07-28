/**
 * Lightweight keyword retrieval over the corpus (TF-style term overlap with
 * IDF weighting). Deliberately dependency-free for v1 — at 184 chunks this
 * outperforms its weight class; swap in embeddings when the corpus grows.
 */
import { readFileSync } from "node:fs";

export interface Chunk {
  id: string;
  source: "codebook" | "question";
  ref: string;
  title: string;
  text: string;
}

const STOP = new Set(("a an and are as at be by for from has have in is it its of on or that the to was what when where which who will with you your how many much does must shall may not no yes per the this these those").split(" "));

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9./-]+/g, " ").split(" ").filter(t => t.length > 1 && !STOP.has(t));
}

export class Retriever {
  private chunks: Chunk[];
  private docTokens: string[][];
  private df = new Map<string, number>();

  constructor(corpusPath: string) {
    this.chunks = JSON.parse(readFileSync(corpusPath, "utf8"));
    this.docTokens = this.chunks.map(c => tokens(`${c.ref} ${c.title} ${c.text}`));
    for (const toks of this.docTokens) {
      for (const t of new Set(toks)) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    }
  }

  count(): number {
    return this.chunks.length;
  }

  search(query: string, k = 6): Chunk[] {
    const qTokens = tokens(query);
    if (qTokens.length === 0) return [];
    const n = this.chunks.length;
    const scored = this.chunks.map((chunk, i) => {
      const docSet = new Set(this.docTokens[i]);
      let score = 0;
      for (const t of qTokens) {
        if (docSet.has(t)) {
          const idf = Math.log(1 + n / (this.df.get(t) ?? 1));
          score += idf;
          // exact section-number mentions are a strong signal
          if (/^\d+\.\d+$/.test(t) && chunk.ref.includes(t)) score += 5;
        }
      }
      // prefer authoritative book text slightly over question facts
      if (chunk.source === "codebook" && score > 0) score *= 1.25;
      return { chunk, score };
    });
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map(s => s.chunk);
  }
}
