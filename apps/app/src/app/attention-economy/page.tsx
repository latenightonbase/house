import type { Metadata } from "next";
import { BarChart3, Clock, Flame, Users } from "lucide-react";
import { PageShell, Section, Placeholder } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Attention Economy — LNOC",
  description: "What a day of internet attention is worth, priced in public.",
};

/**
 * The four figures the page will lead with. Values stay dashed until the
 * analytics endpoint lands — a dash is honest, a zero is not.
 */
const METRICS = [
  { icon: Flame, label: "Total volume", hint: "Committed across every auction" },
  { icon: Clock, label: "Auctions settled", hint: "24-hour slots sold to date" },
  { icon: Users, label: "Unique bidders", hint: "Wallets that have bid at least once" },
  { icon: BarChart3, label: "Average clearing price", hint: "What a day typically costs" },
];

export default function AttentionEconomyPage() {
  return (
    <PageShell
      eyebrow="Attention economy"
      title="What a day of attention"
      titleAccent="actually costs"
      intro="Every auction on LNOC is a public price for one thing: 24 hours of an audience's focus. This page tracks what that price does over time."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => (
          <section key={metric.label} className="card p-5">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg border border-primary/30 bg-primary/10">
              <metric.icon className="w-4 h-4 text-primary-light" aria-hidden="true" />
            </span>
            <p className="mt-4 panel-label">{metric.label}</p>
            <p className="mt-1.5 text-[26px] font-bold text-white numeric">—</p>
            <p className="mt-1.5 text-[11px] text-caption leading-relaxed">{metric.hint}</p>
          </section>
        ))}
      </div>

      <Section
        title="Clearing price over time"
        description="What each day's billboard sold for, auction by auction."
      >
        <Placeholder>Price history chart goes here.</Placeholder>
      </Section>

      <Section title="The thesis">
        <Placeholder>
          The essay on attention as a priced, tradeable asset goes here.
        </Placeholder>
      </Section>
    </PageShell>
  );
}
