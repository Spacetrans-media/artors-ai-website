/**
 * The company's real-world identity — one place, read by the footer, the
 * contact page, the security page and the JSON-LD.
 *
 * Point 3 of the trust layer in docs/PLAN.md §2: named humans, real place,
 * registration. Indian B2B buyers check for a phone number, an address and a
 * registered entity before they take a new agency seriously; their absence
 * reads as a shell.
 *
 * EVERY FIELD BELOW IS RENDERED ONLY IF NON-EMPTY. That is deliberate: an
 * invented address or a made-up GSTIN is a far worse failure than a missing
 * one, and the same rule that keeps fabricated testimonials off this site
 * (§2, "explicitly forbidden") applies to fabricated corporate identity.
 * Fill these in from the actual registration documents — never from memory.
 *
 * Outstanding as of 2026-08-27 — docs/PLAN.md §7.
 */

export type Company = {
  /** Trading name. */
  name: string;
  /** Registered entity name, exactly as on the certificate of incorporation. */
  legalName: string;
  /** GSTIN, 15 characters. */
  gstin: string;
  /** CIN for a Pvt Ltd, or the LLPIN. */
  cin: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  /** E.164, e.g. +919xxxxxxxxx. Used for tel: and the schema. */
  phone: string;
  /** E.164 without punctuation for the wa.me link, e.g. 919xxxxxxxxx. */
  whatsapp: string;
  email: string;
  linkedin: string;
  /** Where lead data physically lives. See docs/SECURITY-COPY note below. */
  dataRegion: string;
};

export const company: Company = {
  name: "Artors",

  // ---- Registration. Blank until the documents are to hand. --------------
  legalName: "",
  gstin: "",
  cin: "",

  // ---- Address. Supplied 2026-09-06; shares the Spacetrans premises. -----
  // postalCode is still blank on purpose. Nobody has confirmed it, and an
  // invented PIN on a schema.org PostalAddress is worse than an absent one:
  // it is the field a verification service checks first.
  address: {
    line1: "4th Floor, Sapphire Mall",
    line2: "",
    city: "Gurugram",
    state: "Haryana",
    postalCode: "",
    country: "India",
  },

  // ---- Contact. Supplied 2026-09-06. -------------------------------------
  phone: "+919599334008",
  whatsapp: "919599334008",
  email: "ai@artors.in",
  linkedin: "",

  /**
   * Verified, not assumed: the application and its MySQL database run on
   * Hostinger's srv1742.hstgr.io, which resolves to in-mum-web1742 — a Mumbai
   * node. Lead data therefore never leaves India, which is the first question
   * a DPDP-conscious buyer asks.
   */
  dataRegion: "Mumbai, India",
};

/** The postal address as a single line, skipping whatever is not filled in. */
export function addressLine(): string {
  const a = company.address;
  return [a.line1, a.line2, a.city, a.state, a.postalCode, a.country]
    .filter(Boolean)
    .join(", ");
}

/** True once there is a real street address, not just a city. */
export function hasFullAddress(): boolean {
  return Boolean(company.address.line1);
}

export function whatsappUrl(message?: string): string | null {
  if (!company.whatsapp) return null;
  const base = `https://wa.me/${company.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
