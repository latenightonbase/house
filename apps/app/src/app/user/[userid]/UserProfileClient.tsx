"use client";

import { useEffect, useState } from "react";
import { PageShell, Section } from "@/components/PageShell";
import { Tabs, type TabItem } from "@/components/ui";
import { ProfileIdentity } from "@/components/profile/ProfileIdentity";
import { SalesHistory } from "@/components/profile/SalesHistory";
import { PurchaseHistory } from "@/components/profile/PurchaseHistory";
import { ContactButton } from "@/components/profile/ContactButton";
import { useSession } from "@/components/SessionProvider";
import { fetchUserProfile, type ProfileOverview } from "@/lib/profileHistory";

type Tab = "sales" | "purchases";

const TABS: TabItem<Tab>[] = [
  { value: "sales", label: "Sold & winners" },
  { value: "purchases", label: "Bought & won" },
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
      <PageShell eyebrow="Profile" title="Not found" intro="No account matches that handle.">
        <div />
      </PageShell>
    );
  }

  const profile = overview?.profile ?? null;
  const isSelf = Boolean(user && profile && user.id === profile.id);
  const loading = state === "loading";

  return (
    <PageShell
      eyebrow="Profile"
      title={profile?.name ?? "Loading…"}
      intro="Everything this account has sold, who won it, and what they have bought or won."
    >
      {state === "error" && (
        <Section>
          <p className="text-[13px] text-negative">Could not load this profile.</p>
        </Section>
      )}

      {profile && (
        <Section>
          <ProfileIdentity
            profile={profile}
            action={
              // Messaging needs a session, and messaging yourself is not a
              // thing — the private profile is the right place for that.
              user && !isSelf ? (
                <ContactButton userId={profile.id} label="Message" size="md" />
              ) : null
            }
          />
        </Section>
      )}

      <Section title="History" action={<Tabs items={TABS} value={tab} onChange={setTab} />}>
        {tab === "sales" ? (
          <SalesHistory sales={overview?.sales ?? null} loading={loading} />
        ) : (
          <PurchaseHistory purchases={overview?.purchases ?? null} loading={loading} />
        )}
      </Section>
    </PageShell>
  );
}
