# Jessica — the site assistant

The assistant on every page of artors.in. She answers questions about Artors,
and when someone is worth talking to, she asks for a callback or a meeting.

## What she is for, in order

1. **Answer the questions that stop someone enquiring.** Price, proof, ownership,
   what happens if it goes wrong. Most of these are not on a page, because they
   are the questions people ask when nobody is watching them.
2. **Capture the ones worth calling.** With the transcript attached, so the call
   opens with what they actually said.
3. **Show the product.** Artors sells conversational AI. A site selling
   conversational AI with no conversational AI on it is an argument against
   itself.

## The pieces

| File | Does |
|---|---|
| `lib/ai/provider.ts` | The only place the site calls a model. Shared with the demo. |
| `lib/chat/knowledge.ts` | Assembles what she knows, per request. |
| `lib/chat/answer.ts` | Her persona, her guardrails, and the intent markers. |
| `lib/chat/store.ts` | Transcripts and spend ceilings. |
| `lib/demo/retrieve.ts` | Cuts the corpus to what one question needs. Shared. |
| `app/api/chat/route.ts` | One turn. |
| `app/api/chat/lead/route.ts` | A captured lead, with the transcript. |
| `components/chat/Jessica.tsx` | The widget. |

## What she knows, and why it is split in two

**The site's own content is read directly** — services, pricing, the FAQ,
security, published glossary terms and insights. Copying those into a knowledge
base would mean maintaining every sentence twice and watching the two drift.
Edit the page; she changes with it.

**`kb_entries`, edited at `/admin/kb`, holds what is not on a page.** Seeded
with 29 entries covering the awkward questions: how long have you been around,
can I see a case study, do I own the code, will AI replace my staff, do you use
my data to train models.

Order matters in the corpus. `retrieve()` always sends the opening whatever was
asked, so the company identity goes first — otherwise "who are you?" has to win
a keyword contest to get answered.

## The guardrails

Three things a friendly model will invent if allowed, all three load-bearing for
a new agency, so each gets an explicit rule rather than a hope:

- **No prices.** Artors publishes none. A chat window is the easiest place in
  the world for a number to escape and become a quote.
- **No case studies, client names, testimonials or statistics.** There are none
  yet. Inventing one in a chat is the same lie as printing it.
- **No contact details that do not exist.** `company.phone` is still blank, so
  she is told she has no number to give and offers to take theirs instead. Fill
  the field in and she starts giving it out — the prompt reads the same source
  the footer does.

## How the asking works

The model appends a marker on its own final line:

```
[[ASK:callback]]   they want someone to ring them
[[ASK:meeting]]    they want a scheduled consultation call
```

The server strips it and returns an `action`. **The client renders a real
form.** The model decides *when* to ask; it never touches *what* is collected.
It cannot mistype a phone number into a field, skip validation, or decide to
ask for something it should not have.

One marker per conversation unless they ask again, and never in the first reply
unless they explicitly asked for a person.

## Booking, honestly

There is **no calendar integration**. "Book a meeting" captures a request with a
preferred time in free text — "Thursday afternoon" — which lands as a lead and
an email, and a human confirms it.

Making it a real booking needs a Cal.com or Google Calendar account and about a
day: swap the `preferred` text field for live slots and write the event back.
Until then the copy says "request", not "booked", because it is.

## Ceilings

Jessica sits on every page and calls a model, which makes her the one thing on
this site a stranger can run up a bill with.

| Limit | Value |
|---|---|
| Turns per conversation | 12 |
| Conversations per IP per day | 6 |
| Turns site-wide per day | 800 |

All read from the database, so a restart does not hand an abuser a fresh budget.
They fail **open** on a database error: a chat that stops working because a
count query failed is worse than one that briefly has no ceiling.

Hitting a cap returns 200, not 429 — it is a thing Jessica says, and the widget
offers the capture form rather than rendering a failure.

## When there is no model key

She falls back to a keyword match over the knowledge base and offers a human.
A worse assistant, but an honest one, and **lead capture keeps working** — which
is the part that actually matters commercially.

## Reading the conversations

`/admin/conversations`, read-only. Two jobs:

- Rows **with** a lead are call notes.
- Rows **without** one are the backlog. Every question she answered badly is an
  answer worth adding at `/admin/kb`.

Adding an entry there is live immediately — she reads the table per request
rather than from a rendered page, so there is nothing to revalidate.

## Cost

Retrieval keeps a turn at roughly 1,300–1,800 tokens. On Groq's free tier that
is comfortably inside the per-minute budget for a normal conversation. See
`.env.example` for provider setup.
