import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getChatSettings } from "@/lib/chat/settings";
import ChatSettingsForm from "@/components/admin/ChatSettingsForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Assistant — Artors Admin" };

export default async function Page() {
  await requireAdmin();
  const settings = await getChatSettings();

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Assistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How she looks and behaves on the site. What she <em>knows</em> is edited separately in{" "}
          <Link href="/admin/kb" className="underline underline-offset-4">
            her knowledge
          </Link>
          , and what she has been asked is in{" "}
          <Link href="/admin/conversations" className="underline underline-offset-4">
            conversations
          </Link>
          .
        </p>
      </header>

      <ChatSettingsForm settings={settings} />
    </div>
  );
}
