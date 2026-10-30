import type { Metadata } from "next";
import { PageShell, Section, Placeholder } from "@/components/PageShell";
import { SocialRow } from "@/components/nav/SocialRow";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `About — ${SITE.shortName}`,
  description: SITE.strapline,
};

export default function AboutPage() {
  return (
    <PageShell
      eyebrow={`About ${SITE.shortName}`}
      title="The world's first market"
      titleAccent="for internet attention"
      intro={`${SITE.name} runs one auction a day for one thing — the undivided attention of the room. ${SITE.keywords}`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="The show">
          <Placeholder>
            What Late Night Onchain is, when it airs, and who is behind it goes here.
          </Placeholder>
        </Section>

        <Section title="The market">
          <Placeholder>
            Why attention is auctioned rather than sold at a rate card goes here.
          </Placeholder>
        </Section>
      </div>

      <Section title="Team">
        <Placeholder>Founders, hosts and contributors go here.</Placeholder>
      </Section>

      <Section title="Get in touch" description="Press, partnerships, or just to say hello.">
        <SocialRow />
      </Section>
    </PageShell>
  );
}
