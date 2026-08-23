import { Suspense } from "react";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import { getServerSession } from "@/lib/server-auth";

export default async function Page() {
  const session = await getServerSession();
  if (!session) {
    redirect("/?auth=required");
  }

  return (
    <Suspense
      fallback={<p className="text-[13px] text-caption">Loading profile…</p>}
    >
      <ProfileClient />
    </Suspense>
  );
}
