import type { Metadata } from "next";
import { PageShell, Section, Placeholder } from "@/components/PageShell";
import { AttentionEconomyClient } from "./AttentionEconomyClient";

export const metadata: Metadata = {
  title: "Attention Economy — LNOC",
  description: "What a day of internet attention is worth, priced in public.",
};

export default function AttentionEconomyPage() {
  return (
    <PageShell
      eyebrow="Attention economy"
      title="What a day of attention"
      titleAccent="actually costs"
      intro="Every auction on LNOC is a public price for one thing: 24 hours of an audience's focus. This page tracks what that price does over time."
    >
      <AttentionEconomyClient />

      <Section title="The thesis">
        <Placeholder>
          The essay on attention as a priced, tradeable asset goes here.
        </Placeholder>
      </Section>
    </PageShell>
  );
}
