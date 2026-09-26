"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Tabs, type TabItem } from "@/components/ui";
import { MyListings } from "@/components/MyListings";
import { ProfileHero, ProfileHeroSkeleton } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { SalesHistory } from "@/components/profile/SalesHistory";
import { PurchaseHistory } from "@/components/profile/PurchaseHistory";
import { fetchMyProfileOverview, type ProfileOverview } from "@/lib/profileHistory";

type Tab = "sales" | "purchases" | "listings";

const TABS: TabItem<Tab>[] = [
  { value: "sales", label: "Sold" },
  { value: "purchases", label: "Bought" },
  { value: "listings", label: "Listings" },
];

/**
 * The signed-in user's own profile. Everything here is the private view: the
 * counterparties carry ids, so each row can open a chat. The public version of
 * the same history lives at /user/[userid] and reuses these same sections.
 */
export default function ProfileClient() {
  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("sales");

  useEffect(() => {
    fetchMyProfileOverview()
      .then(setOverview)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load profile"));
  }, []);

  const loading = !overview && !error;

  return (
    <div className="w-full space-y-4 pb-4">
      {error && (
        <div className="tile border-negative/30 bg-negative/10 px-4 py-3">
          <p className="text-[13px] text-negative">{error}</p>
        </div>
      )}

      {overview?.profile ? (
        <ProfileHero
          profile={overview.profile}
          action={
            overview.profile.username ? (
              <Link
                href={`/user/${overview.profile.username}`}
                className="btn-outline-accent inline-flex h-10 items-center gap-2 px-4 text-[12px]"
              >
                Public profile
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : null
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
          {tab === "sales" && (
            <SalesHistory sales={overview?.sales ?? null} loading={loading} isOwnProfile />
          )}
          {tab === "purchases" && (
            <PurchaseHistory
              purchases={overview?.purchases ?? null}
              loading={loading}
              isOwnProfile
            />
          )}
          {tab === "listings" && <MyListings bare />}
        </div>
      </section>
    </div>
  );
}
