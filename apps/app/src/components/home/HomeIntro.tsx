import Link from "next/link";
import { Megaphone, Wallet } from "lucide-react";
import { HOME_INTRO } from "@/lib/constants";

const ICONS = {
  buy: Megaphone,
  monetize: Wallet,
} as const;

/**
 * What LNOC is, in one glance, above everything else. A first-time visitor
 * lands on a billboard and an auction; without this they have no idea what
 * either is for. Kept to a headline and a row of chips so that on a phone the
 * billboard and the live auction still make it above the fold.
 */
export function HomeIntro() {
  return (
    <section>
      <h1 className="display text-[26px] leading-[1.08] tracking-[-0.03em] text-white sm:text-[clamp(1.75rem,5vw,2.75rem)] sm:uppercase sm:leading-[0.95]">
        The internet marketplace <br className="sm:hidden" />
        for <span className="text-primary-bright">attention</span>
      </h1>

      <ul className="mt-3.5 flex flex-wrap gap-2 sm:mt-5">
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
