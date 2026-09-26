"use client";

import { useEffect, useState } from "react";
import { UserX } from "lucide-react";
import { Tabs, type TabItem } from "@/components/ui";
import { ProfileHero, ProfileHeroSkeleton } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { SalesHistory } from "@/components/profile/SalesHistory";
import { PurchaseHistory } from "@/components/profile/PurchaseHistory";
import { ContactButton } from "@/components/profile/ContactButton";
import { useSession } from "@/components/SessionProvider";
import { fetchUserProfile, type ProfileOverview } from "@/lib/profileHistory";

type Tab = "sales" | "purchases";

const TABS: TabItem<Tab>[] = [
  { value: "sales", label: "Sold" },
  { value: "purchases", label: "Bought" },
];

/**
 * Anyone's public profile. The history sections are the same components the
 * private page uses — the difference is entirely in the payload, which comes
 * back with counterparty ids stripped, so no row here offers a contact button.
 *
 * The one messaging affordance is at the top: a signed-in visitor can message
 * the profile's owner directly, which is a deliberate choice about the person
 * whose page this is rather than about the strangers listed on it.
 */
export default function UserProfileClient({ handle }: { handle: string }) {
  const { user } = useSession();
  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [tab, setTab] = useState<Tab>("sales");

  useEffect(() => {
    let active = true;
    setState("loading");

    fetchUserProfile(handle)
      .then((data) => {
        if (!active) return;
        if (!data?.profile) {
          setState("missing");
          return;
        }
        setOverview(data);
        setState("ready");
      })
      .catch(() => active && setState("error"));

    return () => {
      active = false;
    };
  }, [handle]);

  if (state === "missing") {
    return (
      <div className="panel-glow flex min-h-[18rem] flex-col items-center justify-center p-8 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
          <UserX className="h-5 w-5 text-primary-light" aria-hidden="true" />
        </span>
        <h1 className="mt-4 display text-[clamp(1.25rem,3.4vw,1.75rem)] uppercase text-white">
          No such account
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-[13px] leading-relaxed text-caption">
          Nothing on LNOC matches <span className="text-white">{handle}</span>.
        </p>
      </div>
    );
  }

  const profile = overview?.profile ?? null;
  const isSelf = Boolean(user && profile && user.id === profile.id);
  const loading = state === "loading";

  return (
    <div className="w-full space-y-4 pb-4">
      {state === "error" && (
        <div className="tile border-negative/30 bg-negative/10 px-4 py-3">
          <p className="text-[13px] text-negative">Could not load this profile.</p>
        </div>
      )}

      {profile ? (
        <ProfileHero
          profile={profile}
          action={
            // Messaging needs a session, and messaging yourself is not a
            // thing — the private profile is the right place for that.
            user && !isSelf ? <ContactButton userId={profile.id} label="Message" size="md" /> : null
          }
        />
      ) : (
        loading && <ProfileHeroSkeleton />
      )}

      {overview && <ProfileStats sales={overview.sales} purchases={overview.purchases} />}

      <section className="card p-4 sm:p-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <h2 className="panel-label text-primary-light">History</h2>
          <div className="sm:ml-auto">
            <Tabs items={TABS} value={tab} onChange={setTab} />
          </div>
        </header>

        <div className="mt-4">
          {tab === "sales" ? (
            <SalesHistory sales={overview?.sales ?? null} loading={loading} />
          ) : (
            <PurchaseHistory purchases={overview?.purchases ?? null} loading={loading} />
          )}
        </div>
      </section>
    </div>
  );
}
