import Link from "next/link";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { getOverview } from "@/lib/admin/queries";
import { getUsage } from "@/lib/admin/usage";
import UsagePanel from "@/components/admin/UsagePanel";
import { getHealth } from "@/lib/admin/health";
import { COLLECTION_LIST } from "@/lib/admin/collections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Badge } from "@/components/admin/ui/badge";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default async function OverviewPage() {
  const [data, health, usage] = await Promise.all([
    getOverview().catch(() => null),
    getHealth(),
    getUsage().catch(() => null),
  ]);
  const broken = health.filter((c) => !c.ok);

  const healthPanel = broken.length > 0 && (
    <section className="space-y-2">
      {broken.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <p className="flex items-center gap-2 font-medium text-destructive">
            <XCircle className="size-4 shrink-0" aria-hidden />
            {c.label}
          </p>
          <p className="mt-1 font-mono text-xs break-all text-muted-foreground">{c.detail}</p>
          {c.hint && <p className="mt-2 text-muted-foreground">{c.hint}</p>}
        </div>
      ))}
    </section>
  );

  if (!data) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The dashboard cannot load until the database connects. The exact error is below.
          </p>
        </header>
        {healthPanel}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Leads and everything the public site reads from the database.
        </p>
      </header>

      {healthPanel}

      {broken.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
          Database and email are both connected.
        </p>
      )}

      {data.leads.unnotified > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="text-sm">
            <p className="font-medium text-destructive">
              {data.leads.unnotified} lead{data.leads.unnotified === 1 ? "" : "s"} were saved but
              never emailed
            </p>
            <p className="mt-0.5 text-muted-foreground">
              The lead is safe in the database — only the notification failed. Check the SMTP
              settings, then work these from{" "}
              <Link href="/admin/leads" className="underline">
                Leads
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total leads" value={data.leads.total} />
        <Stat label="New" value={data.leads.new} hint="Not yet contacted" />
        <Stat label="Last 7 days" value={data.leads.last7} />
        <Stat
          label="Unnotified"
          value={data.leads.unnotified}
          hint={data.leads.unnotified ? "Needs attention" : "All delivered"}
        />
      </section>

      {usage && <UsagePanel usage={usage} />}

      <section>
        <h2 className="mb-3 text-sm font-semibold">Site content</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {COLLECTION_LIST.map((c) => {
            const stat = data.content[c.key];
            return (
              <Link key={c.key} href={c.href} className="group">
                <Card className="h-full transition-colors group-hover:border-foreground/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm font-medium">
                      {c.title}
                      {stat.published === 0 ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          hidden
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{stat.published} live</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tabular-nums">{stat.total}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stat.published === 0
                        ? "Nothing published — the section is hidden on the site."
                        : `${stat.total - stat.published} unpublished`}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
