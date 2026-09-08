import type { Metadata } from "next";
import LeadForm from "@/components/lead/LeadForm";
import { company, addressLine, hasFullAddress, whatsappUrl, phoneDisplay } from "@/lib/content/company";
import l from "@/components/lead/lead.module.css";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact | Artors",
  description:
    "Book a free strategy call. Tell us the number you want moved; we reply within a day with a clear next step.",
};

/**
 * The no-JS and direct-visit home of the lead form. Site CTAs open
 * the same form in the consultation popup.
 *
 * The direct-contact block beside it exists because a form alone is a weak
 * signal in Indian B2B — a buyer wants a number they can ring and a place the
 * business actually is. Each line appears only once lib/content/company.ts
 * holds the real value; nothing here is invented.
 */
export default function ContactPage() {
  const wa = whatsappUrl("Hi Artors — I'd like to talk about an AI system for my business.");

  return (
    <main id="main" style={{ paddingTop: 150 }}>
      <section className={l.embed} aria-labelledby="contact-heading">
        <div className={`shell ${l.embedGrid}`}>
          <div>
            <p className={l.kicker}>Free strategy call</p>
            <h1 id="contact-heading" className={l.embedTitle}>
              Tell us the number you want moved.
            </h1>
            <p className={l.embedText}>
              Revenue, cost, hours, response time. We reply within a day with a clear, itemised
              next step. No spam, no retainer pitch.
            </p>

            <dl className={l.direct}>
              {company.phone && (
                <div className={l.directRow}>
                  <dt className={l.directLabel}>Phone</dt>
                  <dd className={l.directValue}>
                    <a href={`tel:${company.phone}`}>{phoneDisplay()}</a>
                  </dd>
                </div>
              )}
              {wa && (
                <div className={l.directRow}>
                  <dt className={l.directLabel}>WhatsApp</dt>
                  <dd className={l.directValue}>
                    <a href={wa} target="_blank" rel="noopener noreferrer">
                      Message us
                    </a>
                  </dd>
                </div>
              )}
              <div className={l.directRow}>
                <dt className={l.directLabel}>Email</dt>
                <dd className={l.directValue}>
                  <a href={`mailto:${company.email}`}>{company.email}</a>
                </dd>
              </div>
              <div className={l.directRow}>
                <dt className={l.directLabel}>{hasFullAddress() ? "Office" : "Based in"}</dt>
                <dd className={l.directValue}>
                  <address className={l.directAddress}>{addressLine()}</address>
                </dd>
              </div>
            </dl>
          </div>

          <LeadForm />
        </div>
      </section>
    </main>
  );
}
