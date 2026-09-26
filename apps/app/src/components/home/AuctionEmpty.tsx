import { Gavel } from "lucide-react";

/** No daily auction is live — the operator has not opened the next one yet. */
export function AuctionEmpty() {
  return (
    <section className="panel-glow flex min-h-[15rem] flex-col items-center justify-center p-6 text-center sm:p-8">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
        <Gavel className="h-5 w-5 text-primary-light" aria-hidden="true" />
      </span>
      <h2 className="mt-4 display text-[clamp(1.25rem,3.4vw,1.75rem)] uppercase text-white">
        No auction live right now
      </h2>
      <p className="mx-auto mt-3 max-w-xs text-[13px] leading-relaxed text-caption">
        The next 24-hour attention auction opens as soon as the current billboard run ends. Follow
        along and be ready to bid.
      </p>
    </section>
  );
}
