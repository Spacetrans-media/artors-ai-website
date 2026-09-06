import { listChatSessions } from "@/lib/admin/queries";
import { Badge } from "@/components/admin/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "Conversations — Artors Admin" };

/**
 * Every chat Jessica has had.
 *
 * Read-only on purpose. The useful actions on a conversation are elsewhere:
 * a conversation that produced a lead is worked in Leads, and one that
 * exposed a gap is fixed by adding an answer in Jessica's knowledge. A row
 * here is evidence, not a task.
 */

function when(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export default async function Page() {
  const rows = await listChatSessions();
  const withLead = rows.filter((r) => r.leadId).length;

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Conversations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What people asked Jessica. The ones that produced a lead are your call notes; the ones
          that did not are the queue for her knowledge base — every question she answered badly is
          an answer worth adding.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No conversations yet. They appear here as soon as someone talks to her.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {rows.length} conversation{rows.length === 1 ? "" : "s"}
            {withLead > 0 && <> · {withLead} produced a lead</>}
          </p>

          <div className="space-y-3">
            {rows.map((row) => {
              const messages = row.messages ?? [];
              const firstQuestion =
                messages.find((m) => m.role === "user")?.content ?? "(no question asked)";

              return (
                <details
                  key={String(row.id)}
                  className="group rounded-lg border border-border bg-card"
                >
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{firstQuestion}</span>
                    {row.intent !== "none" && (
                      <Badge variant="secondary">
                        {row.intent === "meeting" ? "Meeting" : "Callback"}
                      </Badge>
                    )}
                    {row.leadId ? (
                      <Badge>Lead #{row.leadId}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">no lead</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {row.turns} turn{row.turns === 1 ? "" : "s"}
                    </span>
                    <span className="text-xs text-muted-foreground">{when(row.createdAt)}</span>
                  </summary>

                  <div className="space-y-3 border-t border-border px-4 py-4">
                    {row.sourcePath && (
                      <p className="text-xs text-muted-foreground">Started on {row.sourcePath}</p>
                    )}
                    {messages.map((m, i) => (
                      <div key={i} className="text-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {m.role === "user" ? "Visitor" : "Jessica"}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
