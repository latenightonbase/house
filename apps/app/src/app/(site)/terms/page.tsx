import type { Metadata } from "next";
import { PageShell, Section, Placeholder } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Terms of Service — LNOC",
  description: "The terms governing bidding and billboard placement on LNOC.",
};

/** The clause headings the drafted terms will fill. */
const CLAUSES = [
  "Acceptance of terms",
  "Eligibility and accounts",
  "Bidding, escrow and settlement",
  "Billboard placement and content standards",
  "Refunds and cancelled auctions",
  "Intellectual property",
  "Disclaimers and limitation of liability",
  "Governing law",
];

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms of"
      titleAccent="service"
      intro="These terms govern bidding on LNOC auctions and the placement that a winning bid buys."
    >
      <Section>
        <Placeholder>
          Final terms are being drafted. The sections below are the structure they will follow.
        </Placeholder>

        <ol className="mt-5 space-y-2.5">
          {CLAUSES.map((clause, index) => (
            <li
              key={clause}
              className="tile px-4 py-3.5 flex items-baseline gap-3 text-[14px] text-white/90"
            >
              <span className="text-[11px] font-semibold text-caption numeric shrink-0 w-6">
                {String(index + 1).padStart(2, "0")}
              </span>
              {clause}
            </li>
          ))}
        </ol>
      </Section>
    </PageShell>
  );
}
