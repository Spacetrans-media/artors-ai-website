import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { Inter } from "next/font/google";
import "../globals.css";
import Header from "@/components/site/Header";
import GradualBlur from "@/components/fx/GradualBlur";
import PageFx from "@/components/fx/PageFx";
import Footer from "@/components/site/Footer";
import LeadModal from "@/components/lead/LeadModal";
import Jessica from "@/components/chat/Jessica";

// Variable font — one file, full weight range. The design system only
// ever uses 600 and 700 (docs/DESIGN.md §2).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  // metadataBase makes every relative canonical, OG and Twitter URL below
  // resolve to an absolute one. Without it Next emits relative canonicals,
  // which crawlers ignore.
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  /**
   * 54 characters, inside the <=60 target.
   *
   * Leads with "Agentic AI" because that is the term buyers are now searching
   * and the one this site is being positioned to own. No country in the title:
   * clients are targeted globally, and "Gurugram" in a 60-character title
   * spends a fifth of it telling most of the world the wrong thing.
   */
  title: "Agentic AI & Multi-Agent Systems for Business | Artors",
  description:
    "Artors builds agentic AI for business: teams of AI agents that handle sales, support, operations and reporting end to end, so revenue goes up, cost comes down and your team gets its hours back. Based in Gurugram, working remotely worldwide. Live in days.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        {children}
        <Footer />
        <LeadModal />
        <Jessica />
        <GradualBlur />
        <PageFx />
      </body>
    </html>
  );
}
