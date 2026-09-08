import Link from "next/link";
import Image from "next/image";
import { navItems } from "@/lib/content/nav";
import { company, addressLine, whatsappUrl, phoneDisplay } from "@/lib/content/company";
import lockup from "@/public/artors-lockup.png";
import AskAI from "./AskAI";
import s from "./footer.module.css";

/**
 * Footer: the identity signals a B2B buyer looks for before taking a new
 * agency seriously — a reachable phone number, a physical address, a
 * registered entity and a GSTIN — plus the quiet close.
 *
 * Every one of those renders only when `lib/content/company.ts` actually holds
 * it. Missing is honest; invented would be a fabricated corporate identity,
 * which docs/PLAN.md §2 rules out for the same reason it rules out
 * fabricated testimonials. That is why the columns are built from filtered
 * lists rather than written out as markup: an empty field leaves no gap.
 */

type FooterLink = { label: string; href: string; external?: boolean };

function LinkColumn({ label, links }: { label: string; links: FooterLink[] }) {
  if (!links.length) return null;
  return (
    <div className={s.col}>
      <p className={s.colLabel}>{label}</p>
      <ul className={s.list}>
        {links.map((l) => (
          <li key={l.href}>
            {l.external ? (
              <a href={l.href} target="_blank" rel="noopener noreferrer" className={s.link}>
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className={s.link}>
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const wa = whatsappUrl("Hi Artors — I'd like to talk about an AI system for my business.");
  const address = addressLine();

  const talkTo: FooterLink[] = [
    company.phone && { label: phoneDisplay(), href: `tel:${company.phone}` },
    wa && { label: "WhatsApp", href: wa, external: true },
    { label: company.email, href: `mailto:${company.email}` },
  ].filter(Boolean) as FooterLink[];

  const more: FooterLink[] = [
    { label: "Free calculators", href: "/tools" },
    { label: "Website agent demo", href: "/tools/website-agent" },
    { label: "Insights", href: "/insights" },
    { label: "AI glossary", href: "/glossary" },
    { label: "Security & data", href: "/security" },
    company.linkedin && { label: "LinkedIn", href: company.linkedin, external: true },
  ].filter(Boolean) as FooterLink[];

  const legalBits = [
    company.legalName,
    company.cin && `CIN ${company.cin}`,
    company.gstin && `GST ${company.gstin}`,
  ].filter(Boolean);

  return (
    <footer className={s.footer}>
      <div className={`shell ${s.inner}`}>
        <AskAI />

        <div className={s.grid}>
          <div className={s.brand}>
            <Link href="/" aria-label="Artors home" className={s.lockup}>
              <Image src={lockup} alt="Artors — AI Automation" sizes="150px" />
            </Link>
            <p className={s.pitch}>
              Agentic AI for business — teams of AI agents that handle sales, support and
              operations end to end.
            </p>
            {company.phone && (
              <a href={`tel:${company.phone}`} className={s.phone}>
                {phoneDisplay()}
              </a>
            )}
          </div>

          <LinkColumn label="Company" links={navItems} />
          <LinkColumn label="Talk to us" links={talkTo} />
          <LinkColumn label="More" links={more} />
        </div>

        {address && (
          <address className={s.address}>
            <span className={s.colLabel}>Where we are</span>
            {address}
          </address>
        )}

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
