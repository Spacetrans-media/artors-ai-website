import { costOf, type UsageStats, PER_VISITOR } from "@/lib/admin/usage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Badge } from "@/components/admin/ui/badge";

/**
 * Model usage, and what is left.
 *
 * Two questions, deliberately separated. Spend is history. The ceilings are
 * ours — they are what stops one abusive visitor emptying the account — and
 * they are the number worth glancing at, so they get a bar rather than a
 * figure buried in a row.
 */

const nf = new Intl.NumberFormat("en-IN");

function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function money(v: number | null): string | null {
  if (v === null) return null;
  // Fractions of a cent are the normal case here, so two decimals would show
  // every real day as $0.00 and teach nothing.
  if (v > 0 && v < 0.01) return "<$0.01";
  return `$${v.toFixed(2)}`;
}

function Meter({
  label,
  used,
  max,
  hint,
}: {
  label: string;
  used: number;
  max: number;
  hint: string;
}) {
  const pct = Math.min(100, Math.round((used / max) * 100));
  const tight = pct >= 80;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm tabular-nums text-muted-foreground">
          <span className={tight ? "font-semibold text-destructive" : "font-semibold text-foreground"}>
            {nf.format(used)}
          </span>{" "}
          / {nf.format(max)}
        </p>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${tight ? "bg-destructive" : "bg-foreground"}`}
          style={{ width: `${Math.max(pct, used > 0 ? 2 : 0)}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function UsagePanel({ usage }: { usage: UsageStats }) {
  const todayCost = money(costOf(usage.today, usage.prices));
  const weekCost = money(costOf(usage.last7, usage.prices));
  const worst = money(usage.worstCasePerDay);
  const mock = usage.provider === "mock";

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">AI usage</h2>
        {mock ? (
          <Badge variant="outline" className="text-muted-foreground">
            no key — running on keyword fallback
          </Badge>
        ) : (
          <Badge variant="secondary">
            {usage.provider} · {usage.model}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {todayCost ?? tokens(usage.today.inputTokens + usage.today.outputTokens)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {nf.format(usage.today.requests)} call{usage.today.requests === 1 ? "" : "s"} ·{" "}
              {tokens(usage.today.inputTokens)} in · {tokens(usage.today.outputTokens)} out
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Last 7 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {weekCost ?? tokens(usage.last7.inputTokens + usage.last7.outputTokens)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {nf.format(usage.last7.requests)} call{usage.last7.requests === 1 ? "" : "s"}
              {usage.avgInputTokens > 0 && <> · {nf.format(usage.avgInputTokens)} tokens a call</>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Worst case a day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{worst ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {worst
                ? "If every limit below were hit by abuse. Not a forecast."
                : "Set AI_PRICE_INPUT_PER_M and AI_PRICE_OUTPUT_PER_M to cost this."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">How much is left today</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Meter
            label="Assistant messages"
            used={usage.ceilings.chatTurns.used}
            max={usage.ceilings.chatTurns.max}
            hint={`Across the whole site. One visitor gets ${PER_VISITOR.chatTurns} messages a conversation and ${PER_VISITOR.chatSessionsPerIp} conversations a day.`}
          />
          <Meter
            label="Website-agent demos"
            used={usage.ceilings.demoSessions.used}
            max={usage.ceilings.demoSessions.max}
            hint={`Sites crawled today. Each allows up to ${PER_VISITOR.demoMessages} questions, so this is the more expensive of the two.`}
          />
          <p className="border-t border-border pt-4 text-xs text-muted-foreground">
            These are our own ceilings, not the provider&apos;s. When one is reached the feature
            says so and offers a callback rather than failing — nothing breaks, and the bill
            stops. Raise them in{" "}
            <code className="rounded bg-muted px-1 py-0.5">lib/chat/store.ts</code> and{" "}
            <code className="rounded bg-muted px-1 py-0.5">lib/demo/limits.ts</code>.
          </p>
        </CardContent>
      </Card>

      {usage.bySurface.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Last 7 days by feature</th>
                <th className="px-4 py-2 text-right font-medium">Calls</th>
                <th className="px-4 py-2 text-right font-medium">In</th>
                <th className="px-4 py-2 text-right font-medium">Out</th>
                <th className="px-4 py-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {usage.bySurface.map((r) => (
                <tr key={r.surface} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    {r.surface === "chat"
                      ? "Assistant"
                      : r.surface === "demo"
                        ? "Website-agent demo"
                        : "Other"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{nf.format(r.requests)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{tokens(r.inputTokens)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{tokens(r.outputTokens)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {money(costOf(r, usage.prices)) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
