"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Mail, PencilLine } from "lucide-react";
import { Button, Tabs, type TabItem } from "@/components/ui";
import { MyListings } from "@/components/MyListings";
import { useSession } from "@/components/SessionProvider";
import { EditProfileDialog } from "@/components/profile/EditProfileForm";
import { ProfileHero, ProfileHeroSkeleton } from "@/components/profile/ProfileHero";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { SalesHistory } from "@/components/profile/SalesHistory";
import { PurchaseHistory } from "@/components/profile/PurchaseHistory";
import { fetchMyProfileOverview, type ProfileOverview } from "@/lib/profileHistory";

type Tab = "sales" | "purchases" | "listings";

/** Counts on the history tabs, so a win under "Bought" is visible from "Sold". */
function tabsFor(overview: ProfileOverview | null): TabItem<Tab>[] {
  const counted = (label: string, count: number | undefined) =>
    count ? (
      <span className="inline-flex items-center gap-1.5">
        {label}
        <span className="numeric text-[11px] font-semibold opacity-60">{count}</span>
      </span>
    ) : (
      label
    );
  return [
    { value: "sales", label: counted("Sold", overview?.sales.length) },
    { value: "purchases", label: counted("Bought", overview?.purchases.length) },
    { value: "listings", label: "Listings" },
  ];
}

/**
 * The signed-in user's own profile. Everything here is the private view: the
 * counterparties carry ids, so each row can open a chat. The public version of
 * the same history lives at /user/[userid] and reuses these same sections.
 */
export default function ProfileClient() {
  const { user } = useSession();
  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("sales");
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    fetchMyProfileOverview()
      .then((data) => {
        setOverview(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load profile"));
  }, []);

  useEffect(load, [load]);

  const loading = !overview && !error;
  const openEditor = user ? () => setEditing(true) : undefined;

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
          onEdit={openEditor}
          action={
            <>
              {openEditor && (
                <Button variant="accent-outline" onClick={openEditor} className="text-[12px]">
                  <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit profile
                </Button>
              )}
              {overview.profile.username && (
                <Link
                  href={`/user/${overview.profile.username}`}
                  aria-label="View public profile"
                  className="btn-outline-accent inline-flex h-10 items-center gap-2 px-3 text-[12px] sm:px-4"
                >
                  <span className="hidden sm:inline">Public profile</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </>
          }
        />
      ) : (
        loading && <ProfileHeroSkeleton />
      )}

      {user && !user.emailVerifiedAt && overview?.profile && (
        <div className="tile flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <span
            aria-hidden="true"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary-light sm:flex"
          >
            <Mail className="h-[15px] w-[15px]" />
          </span>
          <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-caption">
            <span className="font-semibold text-white">Add an email</span> to hear when you are
            outbid, win an auction, or a listing of yours sells.
          </p>
          <Button variant="accent-outline" size="sm" onClick={() => setEditing(true)}>
            Add email
          </Button>
        </div>
      )}

      {overview && <ProfileStats sales={overview.sales} purchases={overview.purchases} />}

      <section className="card p-4 sm:p-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <h2 className="panel-label text-primary-light">History</h2>
          <div className="sm:ml-auto">
            <Tabs items={tabsFor(overview)} value={tab} onChange={setTab} />
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

      {/* The overview is built server-side (the name shown is derived there), so
          a save re-reads it rather than patching the page locally. */}
      {user && (
        <EditProfileDialog open={editing} onOpenChange={setEditing} user={user} onSaved={load} />
      )}
    </div>
  );
}
