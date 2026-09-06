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
  // Trimmed from 65 to 53 characters for the <=60 target. Same claim, same
  // keywords, no positioning change.
  title: "Artors | AI Agency in Gurugram That Grows Your Numbers",
  description:
    "Artors is an AI agency in Gurugram building automation, voice agents, chatbots, content engines and analytics that add revenue, cut operating cost, and give your team its hours back. Any industry, across India. Live in days.",
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
