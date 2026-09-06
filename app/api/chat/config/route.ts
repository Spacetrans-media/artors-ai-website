import { NextResponse } from "next/server";
import { getChatSettings, toPublic } from "@/lib/chat/settings";

/**
 * What the widget needs to render itself.
 *
 * A separate request rather than props from the layout, deliberately. Reading
 * the database in app/(site)/layout.tsx would make all 63 static pages
 * dynamic, which is a real cost on every page load to configure one button.
 * This is a single small JSON, cached at the edge, fetched once per visit.
 *
 * `persona` is stripped: it shapes the model's instructions and is nobody's
 * business but the server's.
 */
export async function GET() {
  const settings = await getChatSettings();
  return NextResponse.json(toPublic(settings), {
    headers: {
      // Sixty seconds of shared cache. An admin edit shows up within a minute,
      // which is the right trade for not hitting MySQL on every page view.
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
