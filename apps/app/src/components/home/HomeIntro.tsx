import Link from "next/link";
import { ShoppingBag, Tag } from "lucide-react";
import { HOME_INTRO } from "@/lib/constants";

const ICONS = {
  buy: ShoppingBag,
  monetize: Tag,
} as const;

/**
 * What LNOC is, in one glance, above everything else. A first-time visitor
 * lands on a billboard and an auction; without this they have no idea what
 * either is for. Kept to a headline and a row of chips so that on a phone the
 * billboard and the live auction still make it above the fold; on a wide
 * screen the chips share the headline's line.
 */
export function HomeIntro() {
  return (
    <section className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5 sm:gap-y-4">
      <h1 className="display text-[26px] leading-[1.08] tracking-[-0.03em] text-white sm:text-[clamp(1.75rem,5vw,2.75rem)] sm:uppercase sm:leading-[0.95]">
        Onchain <span className="text-primary-bright">eBay</span>
      </h1>

      {/* Beside the headline when the row has room for both; under it otherwise. */}
      <ul className="flex flex-wrap gap-2">
        {HOME_INTRO.pillars.map((pillar) => {
          const Icon = ICONS[pillar.icon];
          return (
            <li key={pillar.label}>
              <Link
                href={pillar.href}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong bg-surface-2 px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:border-primary/60 hover:bg-primary/10 sm:h-10 sm:px-4 sm:text-[13px]"
              >
                <Icon className="h-3.5 w-3.5 text-primary-light" aria-hidden="true" />
                {pillar.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
