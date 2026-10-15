import { Mic, Megaphone, MonitorPlay, Clapperboard } from "lucide-react";
import { WINNER_BENEFITS } from "@/lib/constants";

const ICONS = {
  mic: Mic,
  screen: MonitorPlay,
  megaphone: Megaphone,
  clips: Clapperboard,
} as const;

/**
 * What the auction's winner gets, as the billboard's footer. The billboard is
 * the prize, so the prize list belongs on it rather than in a strip of its own
 * at the foot of the page. On a phone it is one scrolling line, so the
 * billboard and the live auction still share the first screen.
 */
export function WinnerBenefits() {
  return (
    <div className="relative border-t border-gold/20 bg-background/45 px-3 py-2.5 sm:px-5 sm:py-3.5">
      <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-gold-light max-sm:hidden">
        The winner gets
      </p>
      <ul className="scrollbar-none flex min-w-0 gap-4 overflow-x-auto sm:grid sm:grid-cols-2 sm:gap-x-5 sm:gap-y-2.5 lg:grid-cols-4">
        {WINNER_BENEFITS.map((benefit) => {
          const Icon = ICONS[benefit.icon];
          return (
            <li key={benefit.label} className="flex shrink-0 items-center gap-2 sm:min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gold/30 bg-gold/[0.07]">
                <Icon className="h-3.5 w-3.5 text-gold-light" aria-hidden="true" />
              </span>
              <span className="whitespace-nowrap text-[11.5px] leading-snug text-white/85 sm:whitespace-normal">
                {benefit.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
