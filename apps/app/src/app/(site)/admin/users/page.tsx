import { Suspense } from "react";
import { redirect } from "next/navigation";
import AdminUsersClient from "./AdminUsersClient";
import { getServerSession } from "@/lib/server-auth";

export default async function Page() {
  const session = (await getServerSession()) as { role?: string } | null;
  if (!session) redirect("/?auth=required");
  if (session.role !== "SUPERADMIN") redirect("/");

  return (
    <Suspense fallback={<p className="text-[13px] text-caption">Loading accounts…</p>}>
      <AdminUsersClient />
    </Suspense>
  );
}
