import { COLLECTIONS } from "@/lib/admin/collections";
import { listCollection } from "@/lib/admin/queries";
import CollectionManager from "@/components/admin/CollectionManager";

export const dynamic = "force-dynamic";

const SPEC = COLLECTIONS.kb;

export const metadata = { title: SPEC.title + " — Artors Admin" };

export default async function Page() {
  const rows = await listCollection(SPEC.key);
  return <CollectionManager spec={SPEC} rows={rows} />;
}
