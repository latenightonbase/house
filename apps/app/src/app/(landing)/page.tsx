import Link from "next/link";
import { ArrowRight, Megaphone, Mic, Store, type LucideIcon } from "lucide-react";
import { Wordmark } from "@/components/nav/Wordmark";
import { SocialRow } from "@/components/nav/SocialRow";
import { APP_HOME_HREF, CALL_PURPOSES, COPYRIGHT_YEAR, FOOTER_LINKS, SITE } from "@/lib/constants";

type Door = { href: string; label: string; blurb: string; icon: LucideIcon; primary?: boolean };

/** The two show doors run the paid-call flow; the third is the app itself. */
const DOORS: Door[] = [
  {
    href: CALL_PURPOSES.appear.href,
    label: "Appear on a show",
    blurb: "Come on as a guest — book a call with Bill to plan it.",
    icon: Mic,
    primary: true,
  },
  {
    href: CALL_PURPOSES.sponsor.href,
    label: "Sponsor a show",
    blurb: "Put your brand in front of the audience — book a call to shape it.",
    icon: Megaphone,
    primary: true,
  },
  {
    href: APP_HOME_HREF,
    label: "Marketplace",
    blurb: "The live auction and every placement for sale, onchain.",
    icon: Store,
  },
];

/**
 * The front door: the wordmark and three ways in. It sits outside the app's
 * chrome — no rail, no tab bar — so the choice is the only thing on screen.
 */
export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pt-[calc(var(--safe-top)+3rem)] pb-[calc(var(--safe-bottom)+1.5rem)] sm:px-8">
      <div className="flex flex-1 flex-col items-center justify-center gap-10 sm:gap-14">
        <header className="flex flex-col items-center gap-5 text-center">
          <h1>
            <Wordmark size="xl" />
          </h1>
          <p className="max-w-md text-balance text-[15px] leading-relaxed text-caption sm:text-[17px]">
            {SITE.strapline}
          </p>
        </header>

        <nav aria-label="Get started" className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {DOORS.map(({ href, label, blurb, icon: Icon, primary }) => (
            <Link
              key={href}
              href={href}
              className={
                primary
                  ? "group gradient-button flex flex-col gap-4 rounded-2xl p-5 text-white transition-transform hover:-translate-y-0.5 sm:p-6"
                  : "group panel-glow flex flex-col gap-4 p-5 text-white transition-[transform,border-color] hover:-translate-y-0.5 hover:border-primary/60 sm:p-6"
              }
            >
              <span
                className={
                  primary
                    ? "flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"
                    : "flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary-light"
                }
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex items-center justify-between gap-3">
                <span className="display text-[22px] uppercase leading-tight sm:text-[24px]">{label}</span>
                <ArrowRight
                  className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
              <span className={primary ? "text-[13.5px] leading-relaxed text-white/80" : "text-[13.5px] leading-relaxed text-caption"}>
                {blurb}
              </span>
            </Link>
          ))}
        </nav>
      </div>

      <footer className="mt-12 flex flex-col items-center gap-5 text-[11px] text-caption sm:flex-row sm:justify-between">
        <SocialRow className="flex flex-col items-center sm:items-start" />
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
          <span>
            © {COPYRIGHT_YEAR} {SITE.name}
          </span>
        </div>
      </footer>
    </main>
  );
}
