import type { Metadata } from "next";
import { Gavel, MessageSquare, ShieldCheck, Tag } from "lucide-react";
import { PageShell, Section, Placeholder } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "How It Works — LNOC",
  description:
    "List goods and services at a fixed price or at auction, and settle every sale on-chain.",
};

/** The four beats of a sale, in the order buyer and seller live them. */
const STEPS = [
  {
    icon: Tag,
    title: "List it",
    body: "Add a title, a photo and a price — fixed, or an auction with a reserve. Price it in USDG, LNOC or any token on Robinhood Chain. You sign one transaction and the listing is live.",
  },
  {
    icon: Gavel,
    title: "Buy or bid",
    body: "Buy a fixed-price listing outright, or bid on an auction. Bids are escrowed on-chain, and if you are outbid your funds are returned automatically.",
  },
  {
    icon: ShieldCheck,
    title: "Settle on-chain",
    body: "A fixed-price sale settles the moment you buy. When an auction's clock runs out, the contract pays the seller and records the highest bidder as the winner.",
  },
  {
    icon: MessageSquare,
    title: "Arrange delivery",
    body: "Buyer and seller message each other on LNOC to hand over the goods or deliver the service.",
  },
];

export default function HowItWorksPage() {
  return (
    <PageShell
      eyebrow="How it works"
      title="Buy and sell"
      titleAccent="onchain."
      intro="LNOC is a marketplace for goods and services where every sale settles on Robinhood Chain. List anything at a fixed price or put it up for auction — payment runs through the AuctionHouse contract from bid to payout."
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

      <Section title="Rules & fine print">
        <Placeholder>
          Listing limits, bid increments, auction timing and content policy go here.
        </Placeholder>
      </Section>
    </PageShell>
  );
}
