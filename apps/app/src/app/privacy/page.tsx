import type { Metadata } from "next";
import { PageShell, Section, Placeholder } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Privacy Policy — LNOC",
  description: "What LNOC collects, why, and how long it is kept.",
};

const SECTIONS = [
  {
    title: "What we collect",
    body: "Wallet addresses, session cookies, any email you verify, and the project details you submit with a bid.",
  },
  {
    title: "Why we collect it",
    body: "To run auctions, settle them on-chain, notify you when you win or get outbid, and publish the winning project on the billboard.",
  },
  {
    title: "What is public",
    body: "Bids and settlements are on-chain and public by design. A winning project's details are published on the homepage for its 24-hour run and kept in Past Winners afterwards.",
  },
  { title: "Retention and deletion", body: null },
  { title: "Third parties and processors", body: null },
  { title: "Your rights", body: null },
];

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy"
      titleAccent="policy"
      intro="What LNOC collects when you bid, what becomes public, and what stays private."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <Section key={section.title} title={section.title}>
            {section.body ? (
              <p className="text-[14px] leading-relaxed text-caption">{section.body}</p>
            ) : (
              <Placeholder>Copy for this section goes here.</Placeholder>
            )}
          </Section>
        ))}
      </div>
    </PageShell>
  );
}
