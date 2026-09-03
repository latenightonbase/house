import { SOCIAL_LINKS } from "@/lib/constants";
import { SocialIcon } from "./SocialIcons";
import { cn } from "@/lib/utils";

/** The "Follow us" cluster pinned to the bottom of the sidebar. */
export function SocialRow({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="panel-label">Follow us</p>
      <ul className="flex items-center gap-2 w-full">
        {SOCIAL_LINKS.map((social) => (
          <li key={social.id}>
            <a
              href={social.href}
              target="_blank"
              rel="noreferrer noopener"
              title={`${social.label} — ${social.handle}`}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-line text-caption transition-colors hover:text-white hover:border-primary/60 hover:bg-primary/10"
            >
              <SocialIcon id={social.id} className="w-[15px] h-[15px]" />
              <span className="sr-only">{social.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
