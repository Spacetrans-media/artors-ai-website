"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Building2,
  FileText,
  Quote,
  Users,
  Newspaper,
  BookA,
  Bot,
  MessagesSquare,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/admin/cn";
import { Button } from "@/components/admin/ui/button";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/leads", label: "Leads", icon: Inbox },
  { href: "/admin/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/admin/kb", label: "Jessica's knowledge", icon: Bot },
  { href: "/admin/clients", label: "Logos", icon: Building2 },
  { href: "/admin/case-studies", label: "Case studies", icon: FileText },
  { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { href: "/admin/team", label: "Founders & team", icon: Users },
  { href: "/admin/insights", label: "Insights", icon: Newspaper },
  { href: "/admin/glossary", label: "Glossary", icon: BookA },
];

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 border-b border-border bg-card lg:min-h-screen lg:w-60 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between px-5 py-5 lg:block">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Artors
          </p>
          <p className="text-sm font-semibold">Admin</p>
        </div>
      </div>

      <ul className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto space-y-2 px-5 py-5 lg:absolute lg:bottom-0 lg:w-60">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          View site
        </Link>
        <p className="truncate text-xs text-muted-foreground" title={email}>
          {email}
        </p>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm" className="w-full">
            <LogOut className="size-3.5" aria-hidden />
            Sign out
          </Button>
        </form>
      </div>
    </nav>
  );
}
