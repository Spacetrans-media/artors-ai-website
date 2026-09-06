import "server-only";

/**
 * Picks the parts of a crawled site worth sending to the model.
 *
 * Sending the whole crawl on every turn is what a naive demo does, and it is
 * exactly why this one fell over on a free tier: roughly 8,000 tokens per
 * question against a 12,000-tokens-per-minute limit means the visitor gets one
 * answer and then an error. Paying to avoid that would be paying to fix a
 * mistake rather than a constraint.
 *
 * It is also the wrong shape regardless of cost. A model answers better when
 * handed three relevant passages than twelve pages of menus, cookie notices
 * and footer links, because the relevant sentence is no longer competing with
 * everything else for its attention.
 *
 * This is retrieval done with keyword overlap rather than embeddings: no
 * vector store, no second API key, no extra service to keep alive. Over a
 * dozen pages of marketing copy it picks the right passages nearly every time.
 * A deployed agent across a real site with thousands of pages should use
 * embeddings; at this size they would cost more than they are worth.
 */

/** Big enough to hold a whole idea, small enough that a few of them fit. */
const PASSAGE_CHARS = 700;

/** ~1,250 tokens of context, leaving comfortable room inside a free tier. */
export const CONTEXT_BUDGET_CHARS = 5000;

/**
 * The opening of a site says who it is, and that is relevant to almost every
 * question, so it is sent whether or not it matches the keywords.
 */
const IDENTITY_CHARS = 800;

/** Words too common to tell one passage from another. */
const STOP = new Set([
  "what", "when", "where", "which", "that", "this", "your", "yours", "you", "have", "has",
  "does", "did", "are", "is", "was", "the", "and", "for", "with", "from", "can", "could",
  "would", "should", "about", "tell", "much", "many", "how", "who", "why", "there", "their",
  "them", "they", "any", "all", "get", "got", "give", "please", "want", "need", "into", "out",
]);

function terms(question: string): string[] {
  return [
    ...new Set(
      question
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP.has(w)),
    ),
  ];
}

/**
 * Splits on the crawler's own page and paragraph boundaries first, then cuts
 * anything still oversized at a word boundary. Keeping the "## /pricing"
 * heading attached matters — it is often the strongest signal a passage has.
 */
function passages(content: string): string[] {
  const out: string[] = [];
  for (const block of content.split(/\n{2,}/)) {
    const text = block.trim();
    if (!text) continue;
    if (text.length <= PASSAGE_CHARS) {
      out.push(text);
      continue;
    }
    let i = 0;
    while (i < text.length) {
      let end = Math.min(i + PASSAGE_CHARS, text.length);
      if (end < text.length) {
        const space = text.lastIndexOf(" ", end);
        if (space > i + PASSAGE_CHARS / 2) end = space;
      }
      out.push(text.slice(i, end).trim());
      i = end;
    }
  }
  return out.filter((p) => p.length > 40);
}

/**
 * Returns the context to send for one question: the site's identity, plus the
 * highest-scoring passages up to the budget, in the order they appeared.
 *
 * Falls back to a plain head-slice when nothing matches, so a question the
 * keywords miss still gets the front page rather than an empty context — the
 * model can then say the site does not cover it, which is the honest answer.
 */
export function retrieve(content: string, question: string): string {
  if (content.length <= CONTEXT_BUDGET_CHARS) return content;

  const identity = content.slice(0, IDENTITY_CHARS);
  const rest = passages(content.slice(IDENTITY_CHARS));
  const words = terms(question);

  if (words.length === 0) return content.slice(0, CONTEXT_BUDGET_CHARS);

  const scored = rest.map((text, index) => {
    const lower = text.toLowerCase();
    let score = 0;
    for (const w of words) if (lower.includes(w)) score++;
    // A heading naming the matched word is a stronger signal than a mention
    // buried in a paragraph.
    if (/^##\s/.test(text) && score > 0) score += 0.5;
    return { text, index, score };
  });

  const picked = scored
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const kept: typeof picked = [];
  let used = identity.length;
  for (const p of picked) {
    if (used + p.text.length + 2 > CONTEXT_BUDGET_CHARS) continue;
    kept.push(p);
    used += p.text.length + 2;
  }

  if (kept.length === 0) return content.slice(0, CONTEXT_BUDGET_CHARS);

  kept.sort((a, b) => a.index - b.index);
  return [identity, ...kept.map((p) => p.text)].join("\n\n");
}
