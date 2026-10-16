import type { Metadata } from "next";
import { PageShell, Section, Placeholder } from "@/components/PageShell";
import { SocialRow } from "@/components/nav/SocialRow";
import { SITE } from "@/lib/constants";

const INTRO = `${SITE.name} is a marketplace where anyone can list goods and services, and every sale settles on-chain.`;

export const metadata: Metadata = {
  title: `About — ${SITE.shortName}`,
  description: INTRO,
};

export default function AboutPage() {
  return (
    <PageShell
      eyebrow={`About ${SITE.shortName}`}
      title="The onchain marketplace"
      titleAccent="for goods and services"
      intro={INTRO}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="The show">
          <Placeholder>
            What Late Night Onchain is, when it airs, and who is behind it goes here.
          </Placeholder>
        </Section>

        <Section title="The market">
          <Placeholder>
            Why goods and services belong on-chain goes here.
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
