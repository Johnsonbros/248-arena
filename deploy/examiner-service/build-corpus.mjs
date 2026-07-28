// Builds the Examiner's retrieval corpus from the app's own content:
//   - codebook.html sections (the 248 CMR reference text)
//   - js/questions.js explanations (every fact is tied to a citation)
// Run from this directory:  node build-corpus.mjs
// Output: corpus.json — committed to the repo and copied into the Docker image,
// so the served corpus always matches the app content it was built from.
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../../", import.meta.url);
const html = readFileSync(new URL("codebook.html", root), "utf8");
const questionsSrc = readFileSync(new URL("js/questions.js", root), "utf8");

const chunks = [];

// --- Code Book sections ------------------------------------------------------
const sectionRe = /<div class="code-section"[^>]*>[\s\S]*?<span class="code-section-title">([\s\S]*?)<\/span>[\s\S]*?<div class="code-text">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
let m;
while ((m = sectionRe.exec(html)) !== null) {
  const title = m[1].replace(/&amp;/g, "&").trim();
  const text = m[2]
    .replace(/<h4>/g, "\n## ")
    .replace(/<\/h4>/g, "\n")
    .replace(/<tr>/g, "\n")
    .replace(/<\/(td|th)>/g, " | ")
    .replace(/<li>/g, "\n- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const ref = (title.match(/248 CMR [\d.]+(?:–[\d.]+)?/) || [title])[0];
  chunks.push({ id: `book:${ref}`, source: "codebook", ref, title, text });
}

// --- Question explanations ---------------------------------------------------
const window = {};
// eslint-disable-next-line no-eval
eval(questionsSrc);
for (const q of window.QUESTIONS) {
  chunks.push({
    id: `q:${q.id}`,
    source: "question",
    ref: q.codeRef,
    title: `${q.category}: ${q.question}`,
    text: `${q.question}\nAnswer: ${q.options[q.correct]}\n${q.explanation}`,
  });
}

writeFileSync(new URL("corpus.json", import.meta.url), JSON.stringify(chunks, null, 1));
console.log(`corpus.json written: ${chunks.length} chunks (${chunks.filter(c => c.source === "codebook").length} book sections, ${chunks.filter(c => c.source === "question").length} question facts)`);
