import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import ArticleBody from "@/components/content/ArticleBody";
import FaqBlock from "@/components/content/FaqBlock";
import Button from "@/components/ui/Button";
import MissedCallCalculator from "@/components/tools/MissedCallCalculator";
import AutomationRoiCalculator from "@/components/tools/AutomationRoiCalculator";
import WebsiteAgentDemo from "@/components/demo/WebsiteAgentDemo";
import { faqSchema, ORG_ID } from "@/lib/schema";
import { trail } from "@/lib/seo/breadcrumbs";
import { absoluteUrl } from "@/lib/seo/site";
import { tools, getTool } from "@/lib/content/tools";
import s from "@/app/pages.module.css";
import a from "@/app/(site)/insights/[slug]/article.module.css";
import t from "../tools.module.css";

/**
 * A calculator page.
 *
 * The calculator is the only client component; the copy, FAQ and schema around
 * it are server-rendered, so a crawler that never executes JavaScript still
 * gets the full explanation of what the tool does and how it calculates.
 */

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/tools/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return { title: "Not found | Artors" };

  return {
    title: tool.metaTitle,
    description: tool.metaDescription,
    alternates: { canonical: `/tools/${slug}` },
  };
}

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  return (
    <main id="main">
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: tool.title,
            description: tool.metaDescription,
            url: absoluteUrl(`/tools/${slug}`),
            applicationCategory: "BusinessApplication",
            operatingSystem: "Any modern web browser",
            provider: { "@id": ORG_ID },
            // Free, and stated as such: a price of zero is a fact, unlike the
            // service prices this site deliberately does not publish.
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "INR",
            },
          },
          faqSchema(tool.faq),
          trail({ name: "Tools", path: "/tools" }, { name: tool.title, path: `/tools/${slug}` }),
        ]}
      />

      <section className={s.head}>
        <div className="shell">
          <p className={`${s.label} enter`}>
            <Link href="/tools" className={a.back}>
              Tools
            </Link>
          </p>
          <h1 className={`${a.title} enter`} style={{ "--i": 1 } as React.CSSProperties}>
            {tool.title}
          </h1>
          {/* Direct-answer block: the method, stated so it can be quoted. */}
          <p className={`${a.lede} enter`} style={{ "--i": 2 } as React.CSSProperties}>
            {tool.directAnswer}
          </p>
        </div>
      </section>

      <section className={t.calcSection}>
        <div className="shell">
          <p className={`${t.calcIntro} float-in`}>{tool.intro}</p>
          <div className="float-in">
            {tool.component === "missed-call" && <MissedCallCalculator />}
            {tool.component === "automation-roi" && <AutomationRoiCalculator />}
            {tool.component === "website-agent" && <WebsiteAgentDemo />}
          </div>

          <div className={t.calcCta}>
            <Button href="/contact" label="Book a Consultation Call" arrow />
          </div>
        </div>
      </section>

      <section className={s.section} style={{ paddingTop: 0 }}>
        <div className="shell">
          <ArticleBody markdown={tool.body}>
            <FaqBlock items={tool.faq} />

            <section className={a.related}>
              <h2 className={a.relatedHeading}>Related</h2>
              <ul className={a.relatedList}>
                {tool.related.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} className={a.relatedLink}>
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <div className={a.cta}>
              <p className={a.ctaText}>
                Now you have the number, the useful question is what to do about it. That is
                one call.
              </p>
              <Button href="/contact" label="Book a Consultation Call" arrow />
            </div>
          </ArticleBody>
        </div>
      </section>
    </main>
  );
}
