"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, Section } from "@/components/PageShell";
import { Tabs, type TabItem } from "@/components/ui";
import { MyListings } from "@/components/MyListings";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { SalesHistory } from "@/components/profile/SalesHistory";
import { PurchaseHistory } from "@/components/profile/PurchaseHistory";
import { fetchMyProfileOverview, type ProfileOverview } from "@/lib/profileHistory";

type Tab = "sales" | "purchases" | "listings";

const TABS: TabItem<Tab>[] = [
  { value: "sales", label: "Sold & winners" },
  { value: "purchases", label: "Bought & won" },
  { value: "listings", label: "My listings" },
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
    <PageShell
      eyebrow="Your account"
      title="Profile"
      intro="What you have sold and who won it, what you have bought or won, and every listing you have submitted."
      action={
        overview?.profile?.username ? (
          <Link
            href={`/user/${overview.profile.username}`}
            className="text-[12px] text-caption hover:text-white transition-colors"
          >
            View public profile →
          </Link>
        ) : null
      }
    >
      {error && (
        <Section>
          <p className="text-[13px] text-negative">{error}</p>
        </Section>
      )}

      {overview?.profile && (
        <Section>
          <ProfileIdentity profile={overview.profile} />
        </Section>
      )}

      <Section
        title="History"
        description="Sales show the winner and what they paid, with a way to reach them. Purchases show the creator you bought from."
        action={<Tabs items={TABS} value={tab} onChange={setTab} />}
      >
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
        {tab === "listings" && <MyListings />}
      </Section>
    </PageShell>
  );
}
