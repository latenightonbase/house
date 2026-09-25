import { Suspense } from "react";
import { redirect } from "next/navigation";
import ChatClient from "./ChatClient";
import { getServerSession } from "@/lib/server-auth";

export const metadata = { title: "Messages" };

export default async function Page() {
  const session = await getServerSession();
  if (!session) {
    redirect("/?auth=required");
  }

  return (
    <Suspense fallback={<p className="text-[13px] text-caption">Loading messages…</p>}>
      <ChatClient />
    </Suspense>
  );
}
