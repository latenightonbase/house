import { Suspense } from "react";
import { redirect } from "next/navigation";
import AdminListingsClient from "./AdminListingsClient";
import { getServerSession } from "@/lib/server-auth";

export default async function Page() {
  const session = (await getServerSession()) as { role?: string } | null;
  if (!session) redirect("/?auth=required");
  if (session.role !== "SUPERADMIN") redirect("/");

  return (
    <Suspense fallback={<p className="text-[13px] text-caption">Loading review queue…</p>}>
      <AdminListingsClient />
    </Suspense>
  );
}
