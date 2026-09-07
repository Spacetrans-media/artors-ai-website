import Link from "next/link";
import Image from "next/image";
import { navItems } from "@/lib/content/nav";
import { company, addressLine, whatsappUrl } from "@/lib/content/company";
import lockup from "@/public/artors-lockup.png";
import s from "./footer.module.css";

/**
 * Footer: the lockup, the nav, and the identity signals an Indian B2B buyer
 * looks for before taking a new agency seriously — a reachable phone number,
 * a physical address, a registered entity and a GSTIN.
 *
 * Every one of those renders only when `lib/content/company.ts` actually holds
 * it. Missing is honest; invented would be a fabricated corporate identity,
 * which docs/PLAN.md §2 rules out for the same reason it rules out
 * fabricated testimonials.
 */
export default function Footer() {
  const wa = whatsappUrl("Hi Artors — I'd like to talk about an AI system for my business.");
  const address = addressLine();
  const legalBits = [
    company.legalName,
    company.cin && `CIN ${company.cin}`,
    company.gstin && `GST ${company.gstin}`,
  ].filter(Boolean);

  return (
    <footer className={s.footer}>
      <div className={`shell ${s.inner}`}>
        <div className={s.top}>
          <Link href="/" aria-label="Artors home" className={s.lockup}>
            <Image src={lockup} alt="Artors — AI Automation" sizes="150px" />
          </Link>

          <nav aria-label="Footer">
            <ul className={s.nav}>
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={s.link}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={s.contactRow}>
          <div className={s.contactCol}>
            <p className={s.colLabel}>Talk to us</p>
            <ul className={s.contactList}>
              {company.phone && (
                <li>
                  <a href={`tel:${company.phone}`} className={s.contactLink}>
                    {company.phone}
                  </a>
                </li>
              )}
              {wa && (
                <li>
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.contactLink}
                  >
                    WhatsApp
                  </a>
                </li>
              )}
              <li>
                <a href={`mailto:${company.email}`} className={s.contactLink}>
                  {company.email}
                </a>
              </li>
            </ul>
          </div>

          <div className={s.contactCol}>
            <p className={s.colLabel}>Where we are</p>
            <address className={s.address}>{address}</address>
          </div>

          <div className={s.contactCol}>
            <p className={s.colLabel}>More</p>
            <ul className={s.contactList}>
              <li>
                <Link href="/tools" className={s.contactLink}>
                  Free calculators
                </Link>
              </li>
              <li>
                <Link href="/insights" className={s.contactLink}>
                  Insights
                </Link>
              </li>
              <li>
                <Link href="/glossary" className={s.contactLink}>
                  AI glossary
                </Link>
              </li>
              <li>
                <Link href="/security" className={s.contactLink}>
                  Security &amp; data handling
                </Link>
              </li>
              {company.linkedin && (
                <li>
                  <a
                    href={company.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.contactLink}
                  >
                    LinkedIn
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className={s.bottom}>
          <p className={s.line}>
            {legalBits.length > 0
              ? legalBits.join(" · ")
              : `${company.name} · Agentic AI · ${company.address.city}, working remotely worldwide`}
          </p>
          <p className={s.line}>
            © {new Date().getFullYear()} {company.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
