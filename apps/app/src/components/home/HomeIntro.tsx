import Link from "next/link";
import { ArrowDown, Megaphone, Sparkles, Wallet } from "lucide-react";
import { HOME_INTRO } from "@/lib/constants";

const ICONS = {
  buy: Megaphone,
  monetize: Wallet,
  discover: Sparkles,
} as const;

/**
 * What LNOC is, in one glance, above everything else. A first-time visitor
 * lands on a billboard and an auction; without this they have no idea what
 * either is for.
 */
export function HomeIntro() {
  return (
    <section className="">
      <h1 className="display text-[clamp(1.75rem,5vw,2.75rem)] uppercase text-white">
        {HOME_INTRO.title}
      </h1>

      <ul className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3">
        {HOME_INTRO.pillars.map((pillar) => {
          const Icon = ICONS[pillar.icon];
          return (
            <li
              key={pillar.label}
              className="tile flex min-w-0 flex-col items-center gap-2.5 px-2 py-4 text-center sm:flex-row sm:gap-3 sm:px-4 sm:text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                <Icon className="h-[17px] w-[17px] text-primary-light" aria-hidden="true" />
              </span>
              <span className="text-[12px] font-semibold leading-snug text-white sm:text-[14px]">
                {pillar.label}
              </span>
            </li>
          );
        })}
      </ul>

    </section>
  );
}
