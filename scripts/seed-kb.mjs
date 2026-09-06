/**
 * Seeds Jessica's knowledge base. Idempotent — upserts on question, so
 * re-running updates rather than duplicating.
 *
 *   npm run seed:kb
 *
 * What belongs here, and what does not:
 *
 * The site's own content modules — services, pricing, the FAQ, security,
 * glossary, insights — are read directly by lib/chat/knowledge.ts. Repeating
 * them here would mean maintaining the same sentence twice and watching the
 * two drift. So every entry below answers something that is NOT on a page:
 * the awkward, specific, half-suspicious questions people actually type into
 * a chat window when nobody is watching them.
 *
 * Editorial rules, same as the rest of the site (docs/PLAN.md §2):
 *   - No prices. Artors does not publish any, and a chat window is the easiest
 *     place in the world for a number to escape and become a quote.
 *   - No case studies, client names, testimonials or statistics. There are
 *     none yet, and inventing one in a chat is the same lie as printing it.
 *   - Answer the objection honestly rather than deflecting it. A new agency
 *     that admits it is new is more credible than one that talks around it.
 */
import mysql from "mysql2/promise";

const ENTRIES = [
  // ---- Trust and the new-agency objection ------------------------------
  {
    category: "trust",
    question: "How long has Artors been around, and who are your clients?",
    keywords: "experience, track record, clients, references, how old, established, new company",
    answer:
      "We are new, and I would rather say that than talk around it. We do not have a wall of client logos yet, so the way we ask people to judge us is by what we build, not by who we have built for. Start with a scoped pilot: fixed price, one outcome, and a clean exit if it does not pay for itself. If you want to see the work before that, try the free website agent on our tools page — it builds you something real in about thirty seconds.",
  },
  {
    category: "trust",
    question: "Can you show me a case study?",
    keywords: "case studies, portfolio, examples, proof, past work, results, previous clients",
    answer:
      "Not yet, honestly. We are early enough that the case studies we could show would be small, and a padded one is worse than none. What we can do instead is show you the thing working: the website agent demo on our tools page reads your own site and answers questions about your business, and the pilot we scope on a call is deliberately small enough that you find out cheaply whether we are any good.",
  },
  {
    category: "trust",
    question: "Do I own the code and the system you build?",
    keywords: "ownership, IP, intellectual property, lock in, own the code, licence, proprietary",
    answer:
      "Yes. What we build for you is yours, and we hand over the code, the workflows and the credentials. We do not hold your systems hostage as a retention strategy — if you want to take it in-house or move to someone else, you can, and we will help you do it cleanly. The details go in writing before anything starts.",
  },
  {
    category: "trust",
    question: "What happens if the project goes wrong or I want to stop?",
    keywords: "exit, cancel, refund, guarantee, risk, stop, not working, fail",
    answer:
      "That is exactly why we start with a pilot rather than a big engagement. One system, one outcome, a fixed price agreed up front, and a clean exit if it is not paying. You are not signing a twelve-month retainer to find out whether this works for you.",
  },
  {
    category: "trust",
    question: "Are you an agency or a software company?",
    keywords: "agency, product, company, what kind of business, consultancy",
    answer:
      "An agency, in the sense that we build and run systems for other businesses rather than selling one product to everyone. The work spans seven practices — from embedding AI into an existing product, through process automation and custom agents, to voice and chat, marketing systems, content and consulting.",
  },

  // ---- Pricing and commercials -----------------------------------------
  {
    category: "pricing",
    question: "How much does it cost?",
    keywords: "price, pricing, cost, budget, rate, charges, kitna, fees, quote, how much",
    answer:
      "We do not publish prices, because the honest answer depends on what the system touches, how much it handles, and whether we run it after launch — the same build can differ several times over on those three. What we do is size it properly on a call and give you an itemised number, whether or not you go ahead. Thirty minutes is usually enough.",
  },
  {
    category: "pricing",
    question: "Why will not you just tell me a starting price?",
    keywords: "starting price, ballpark, rough idea, from price, minimum, cheapest",
    answer:
      "Because a starting price would mislead you. A one-off automation is a build and a handover; an always-on agent has to hold live conversations, sit inside your systems and keep working after launch, and that costs several times more. Quoting the first number would set the wrong expectation for the second. Tell me what you are trying to fix and I will get you a real figure quickly.",
  },
  {
    category: "pricing",
    question: "Do you charge monthly or one-off?",
    keywords: "monthly, retainer, subscription, one time, ongoing, recurring, payment terms",
    answer:
      "Both exist, and which one applies depends on what you are buying. Something we build once and hand over is a one-off. Something that runs continuously — an agent taking calls, a system we keep tuned — has a setup cost and a monthly run cost, because it needs to keep working after launch. Every quote itemises which is which before you commit.",
  },
  {
    category: "pricing",
    question: "Is the first call free?",
    keywords: "free, consultation, discovery call, no obligation, charge for the call",
    answer:
      "Yes, and you leave with something whether or not you hire us: a scoped, itemised number for the thing you described. If it turns out automation is the wrong answer for your problem, we will say so on that call rather than sell you something.",
  },

  // ---- Process and delivery --------------------------------------------
  {
    category: "process",
    question: "How long does it take to go live?",
    keywords: "timeline, how long, speed, delivery, weeks, days, when live, fast",
    answer:
      "Most first systems are live within days rather than months, because we deliberately start with one narrow thing that works instead of a platform that might. Bigger builds take longer, but you will see the first working piece early — that is the point of the pilot.",
  },
  {
    category: "process",
    question: "What do you need from me to get started?",
    keywords: "requirements, what do you need, onboarding, access, start, prepare, get going",
    answer:
      "Less than people expect. A conversation about the problem, access to the systems the work touches, and one person on your side who can answer questions and make decisions. We do the rest. If access takes time to arrange internally, we start with what does not need it.",
  },
  {
    category: "process",
    question: "Will my team need to learn something new?",
    keywords: "training, staff, team, learn, adoption, change, difficult, complicated",
    answer:
      "As little as we can manage. The best outcome is that the work simply happens and your team notices the queue got shorter. Where something new does appear, we train the people who will use it and write it down — and our consulting practice exists precisely because the tool is usually the easy half and the adoption is the hard one.",
  },
  {
    category: "process",
    question: "Will AI replace my staff?",
    keywords: "replace jobs, redundant, layoffs, staff, headcount, fire, employees",
    answer:
      "That is not usually what happens, and it is not what we sell. What goes is the repetitive part — the copying between systems, the same twelve questions every day, the after-hours calls nobody was there to take. The people stay and do the part that needed a person. If your goal genuinely is to cut headcount, say so on the call and we will tell you honestly whether the numbers support it.",
  },

  // ---- Services and capability -----------------------------------------
  {
    category: "services",
    question: "Do you work with WhatsApp?",
    keywords: "whatsapp, wa, business api, messaging, chat channel",
    answer:
      "Yes — WhatsApp is one of the main channels we build on, because in India it is where customers actually reply. That covers answering enquiries, qualifying them, booking appointments and pushing the result into your CRM, in English, Hindi or the mix of both people really use.",
  },
  {
    category: "services",
    question: "Can it speak Hindi or Hinglish?",
    keywords: "hindi, hinglish, language, regional, marathi, tamil, bilingual, english",
    answer:
      "Yes, and that matters more than it sounds. Most voice AI is built and tested in English and falls apart on the code-switching Indian customers do naturally in a single sentence. Handling that properly is a design decision made early, not a setting turned on later.",
  },
  {
    category: "services",
    question: "Can you connect it to my CRM or existing software?",
    keywords: "crm, integration, connect, api, hubspot, zoho, salesforce, existing systems, erp",
    answer:
      "Usually yes. Most business software has an API or at least a way in, and connecting to what you already run is normally the point — an agent that cannot write to your CRM just creates a second place to check. Tell me what you use and I will get someone to confirm it properly.",
  },
  {
    category: "services",
    question: "Do you build websites?",
    keywords: "website, web development, site, landing page, microsite, web design",
    answer:
      "We build applications and embed AI into existing products, and web work happens as part of that. If you are after a brochure website on its own, we are probably not the best value for you. If you want a site that does something — qualifies, books, answers, routes — that is squarely what we do.",
  },
  {
    category: "services",
    question: "Can you make a chatbot like this one for my website?",
    keywords: "chatbot for my site, like this, same bot, website agent, embed, widget",
    answer:
      "Yes — I am an example of it. A deployed one knows your whole site rather than a summary, connects to your systems, and can book and qualify rather than only answer. There is also a free demo on our tools page that builds one on your own website in about thirty seconds, no sign-up, if you want to see it before you talk to anyone.",
  },
  {
    category: "services",
    question: "Do you only work with businesses in Gurugram or Delhi NCR?",
    keywords: "location, gurugram, delhi, ncr, remote, city, where, outside india, international",
    answer:
      "We are based in Gurugram but the work is remote, so where you are does not really matter — we work with businesses across India. If you would rather meet in person and you are nearby, that is easy to arrange.",
  },
  {
    category: "services",
    question: "What industries do you work with?",
    keywords: "industry, sector, vertical, real estate, healthcare, clinic, education, ecommerce",
    answer:
      "We are not tied to one. The pattern we look for is a business with repetitive, high-volume work that a person is currently doing by hand — enquiries, bookings, follow-ups, moving data between systems. That shows up in real estate, clinics, education, hospitality and services alike. Tell me your industry and what the bottleneck is, and I can be more specific.",
  },

  // ---- Technical -------------------------------------------------------
  {
    category: "technical",
    question: "Which AI model do you use?",
    keywords: "model, gpt, claude, gemini, llama, openai, which ai, technology, stack",
    answer:
      "It depends on the job, and we deliberately do not marry one. Systems are built so the model underneath can be swapped without rebuilding everything around it, because the best option changes roughly twice a year and you should not have to pay for that. What stays constant is the part that matters: the system knowing your business and being wired into your tools.",
  },
  {
    category: "technical",
    question: "Will it make things up or give wrong answers?",
    keywords: "hallucination, wrong, inaccurate, made up, reliable, accuracy, mistakes, lies",
    answer:
      "That is the real risk in this category, and it is a design problem rather than a model problem. A system that is given your actual information and told to answer only from it — and to admit when it does not know — behaves very differently from one improvising. It is also why we test against your real questions before anything goes in front of a customer, and why anything high-stakes hands off to a person rather than guessing.",
  },
  {
    category: "technical",
    question: "Is my data safe? Where is it stored?",
    keywords: "security, data, privacy, gdpr, dpdp, storage, safe, confidential, where stored",
    answer:
      "Client data sits on servers in India, and we publish what we do with it on our security page rather than asking you to take it on faith — including how call recordings are handled and what happens to your data if we part ways. If your organisation has a policy we need to meet, send it over and we will tell you plainly whether we can.",
  },
  {
    category: "technical",
    question: "Do you use my data to train AI models?",
    keywords: "training data, train, my data, learn from, confidential, reuse",
    answer:
      "No. Your data is used to run your system, not to improve anyone else's. That is worth asking every vendor you talk to, not just us.",
  },

  // ---- Support and aftercare -------------------------------------------
  {
    category: "support",
    question: "What happens after it goes live? Do you disappear?",
    keywords: "support, maintenance, after launch, aftercare, ongoing, help, broken, fix",
    answer:
      "Something that runs continuously needs someone watching it, so ongoing systems come with a run cost that covers exactly that — monitoring, fixes and tuning as your business changes. For one-off builds we hand over properly, with the code and documentation, so you are not stranded either way. What applies to your project is itemised in the quote before you commit.",
  },
  {
    category: "support",
    question: "What if it breaks at 2am?",
    keywords: "downtime, outage, breaks, emergency, 24/7, uptime, fails, support hours",
    answer:
      "Systems we run are monitored, and how quickly someone responds out of hours is part of what we agree up front rather than something you discover during an incident. If uptime is critical to your operation, say so on the call — it changes how the thing is built, not just how it is supported.",
  },

  // ---- About / meta ----------------------------------------------------
  {
    category: "about",
    question: "Are you a real person?",
    keywords: "are you human, real person, bot, ai, who am i talking to, robot",
    answer:
      "I am not — I am the assistant on the Artors site, and I would rather say so than pretend. I can answer most things about what we build and how we work, and the moment you want an actual person I can have someone call you.",
  },
  {
    category: "about",
    question: "How do I contact you?",
    keywords: "contact, email, phone, reach, get in touch, call, speak to someone, talk",
    answer:
      "The quickest way is to leave your number here and have someone ring you — tell me you would like a callback and I will take the details. You can also email us at ai@artors.in.",
  },
  {
    category: "about",
    question: "Can I speak to a human?",
    keywords: "human, person, agent, real, someone, representative, talk to a person",
    answer:
      "Of course. Leave your name and number and someone from the team will call you — just say when suits you and I will pass it on.",
  },
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

let inserted = 0;
let updated = 0;

for (const [i, e] of ENTRIES.entries()) {
  const [rows] = await conn.query("SELECT id FROM kb_entries WHERE question = ?", [e.question]);
  const values = [e.answer, e.keywords ?? null, e.category ?? null, i, 1];

  if (rows.length) {
    await conn.query(
      `UPDATE kb_entries SET answer=?, keywords=?, category=?, sort_order=?, published=?
       WHERE question=?`,
      [...values, e.question],
    );
    updated++;
  } else {
    await conn.query(
      `INSERT INTO kb_entries (question, answer, keywords, category, sort_order, published)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [e.question, ...values],
    );
    inserted++;
  }
}

const [[n]] = await conn.query("SELECT COUNT(*) AS n FROM kb_entries WHERE published = 1");
console.log(`knowledge base: ${inserted} inserted, ${updated} updated — ${n.n} published`);
await conn.end();
