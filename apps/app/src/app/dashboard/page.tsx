import { Suspense } from "react";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { getServerSession } from "@/lib/server-auth";

export default async function Page() {
  const session = await getServerSession();
  if (!session) {
    redirect("/?auth=required");
  }

  return (
    <Suspense fallback={<p className="text-[13px] text-caption">Loading dashboard…</p>}>
      <DashboardClient />
    </Suspense>
  );
}
