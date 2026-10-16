import type { Metadata } from "next";
import { PageShell, Section, Placeholder } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Privacy Policy — LNOC",
  description: "What LNOC collects, why, and how long it is kept.",
};

const SECTIONS = [
  {
    title: "What we collect",
    body: "Wallet addresses, session cookies, any email you verify, the listings you create and the messages you send.",
  },
  {
    title: "Why we collect it",
    body: "To run the marketplace, settle sales on-chain, and notify you when you win, get outbid or buy something.",
  },
  {
    title: "What is public",
    body: "Bids, purchases and settlements are on-chain and public by design. Your listings, and the sales you make or win, show under your public profile name.",
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
