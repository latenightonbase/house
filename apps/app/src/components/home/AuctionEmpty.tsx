import { Gavel } from "lucide-react";

/** No daily auction is live — the operator has not opened the next one yet. */
export function AuctionEmpty() {
  return (
    <section className="panel-glow p-8 sm:p-12 text-center">
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-primary/30 bg-primary/10">
        <Gavel className="w-5 h-5 text-primary-light" aria-hidden="true" />
      </span>
      <h2 className="mt-5 display text-[clamp(1.5rem,4vw,2.25rem)] uppercase text-white">
        No auction live right now
      </h2>
      <p className="mt-3 text-[14px] text-caption max-w-md mx-auto leading-relaxed">
        The next 24-hour attention auction opens as soon as the current billboard run ends. Follow
        along and be ready to bid.
      </p>
    </section>
  );
}
