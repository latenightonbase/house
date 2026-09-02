import type { Metadata } from "next";
import { Gavel, Crown, Trophy, Repeat } from "lucide-react";
import { PageShell, Section, Placeholder } from "@/components/PageShell";
import { WINNER_BENEFITS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "How It Works — LNOC",
  description: "One 24-hour auction a day. The winner takes the billboard and the spotlight.",
};

/** The four beats of the daily cycle, in the order a bidder lives them. */
const STEPS = [
  {
    icon: Gavel,
    title: "Bid with your project",
    body: "Every auction runs for 24 hours. You enter your project name, description, artwork and links once when you place your first bid — get outbid and re-bidding takes one field.",
  },
  {
    icon: Crown,
    title: "Hold the lead",
    body: "Bids are escrowed on-chain. The highest bid when the clock hits zero wins; every other bid is returned automatically.",
  },
  {
    icon: Trophy,
    title: "Take the billboard",
    body: "The winning project goes live on the homepage for a full 24 hours, plus a Late Night spotlight on the show.",
  },
  {
    icon: Repeat,
    title: "The next auction opens",
    body: "The moment one auction settles, a fresh 24-hour auction opens for the following day's slot. The market never closes.",
  },
];

export default function HowItWorksPage() {
  return (
    <PageShell
      eyebrow="How it works"
      title="One auction."
      titleAccent="Every day."
      intro="LNOC sells a single unit of inventory: 24 hours of undivided attention. One auction runs at a time, it settles on the hour it was opened, and the winner is live before the next one starts."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {STEPS.map((step, index) => (
          <section key={step.title} className="card p-6">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl border border-primary/30 bg-primary/10 shrink-0">
                <step.icon className="w-[18px] h-[18px] text-primary-light" aria-hidden="true" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-caption numeric">
                Step {index + 1}
              </span>
            </div>
            <h2 className="mt-4 text-[17px] font-bold text-white">{step.title}</h2>
            <p className="mt-2.5 text-[13px] leading-relaxed text-caption">{step.body}</p>
          </section>
        ))}
      </div>

      <Section
        title="What the winner gets"
        description="Every winning bid buys the same package."
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {WINNER_BENEFITS.map((benefit) => (
            <li key={benefit.label} className="tile px-4 py-3.5 text-[13px] text-white/90">
              {benefit.label}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Rules & fine print">
        <Placeholder>
          Bid increments, reserve pricing, settlement timing and content policy go here.
        </Placeholder>
      </Section>
    </PageShell>
  );
}
