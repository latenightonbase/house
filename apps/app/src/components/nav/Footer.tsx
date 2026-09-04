import Link from "next/link";
import { COPYRIGHT_YEAR, FOOTER_LINKS, SITE } from "@/lib/constants";
import { FooterMark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="border-t border-line mt-8 pt-6 pb-[calc(6rem+var(--safe-bottom))] lg:pb-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex items-start gap-5 min-w-0">
          <FooterMark className="shrink-0" />
          <p className="text-[12px] text-caption leading-relaxed max-w-xs">
            {SITE.strapline}
            <br />
            {SITE.keywords}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 lg:ml-auto text-[11px] uppercase tracking-[0.1em]">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-caption hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <span className="text-caption/70 normal-case tracking-normal">
            © {COPYRIGHT_YEAR} {SITE.shortName}
          </span>
        </div>
      </div>
    </footer>
  );
}
