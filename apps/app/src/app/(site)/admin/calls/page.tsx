import { Suspense } from "react";
import { redirect } from "next/navigation";
import AdminCallsClient from "./AdminCallsClient";
import { getServerSession } from "@/lib/server-auth";

export default async function Page() {
  const session = (await getServerSession()) as { role?: string } | null;
  if (!session) redirect("/marketplace?auth=required");
  if (session.role !== "SUPERADMIN") redirect("/marketplace");

  return (
    <Suspense fallback={<p className="text-[13px] text-caption">Loading calls…</p>}>
      <AdminCallsClient />
    </Suspense>
  );
}
