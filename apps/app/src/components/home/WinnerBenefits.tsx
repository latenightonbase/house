import { Mic, Megaphone, MonitorPlay, Clapperboard } from "lucide-react";
import { WINNER_BENEFITS } from "@/lib/constants";

const ICONS = {
  mic: Mic,
  screen: MonitorPlay,
  megaphone: Megaphone,
  clips: Clapperboard,
} as const;

/** The four-part "winner gets" strip beneath the auction. */
export function WinnerBenefits() {
  return (
    <section className="card p-5 sm:px-7 sm:py-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
        <p className="eyebrow text-primary-light shrink-0">Winner gets:</p>

        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 flex-1 min-w-0">
          {WINNER_BENEFITS.map((benefit) => {
            const Icon = ICONS[benefit.icon];
            return (
              <li key={benefit.label} className="flex items-center gap-3 min-w-0">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg border border-primary/30 bg-primary/10 shrink-0">
                  <Icon className="w-[17px] h-[17px] text-primary-light" aria-hidden="true" />
                </span>
                <span className="text-[13px] leading-snug text-white/90">{benefit.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
