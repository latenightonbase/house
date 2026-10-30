import type { Metadata } from "next";
import { CALL_PURPOSES, SITE } from "@/lib/constants";
import CallClient from "../call/CallClient";

const copy = CALL_PURPOSES.sponsor;

export const metadata: Metadata = {
  title: `${copy.title} ${copy.titleAccent} — ${SITE.shortName}`,
  description: copy.intro(30),
};

export default function SponsorPage() {
  return <CallClient purpose="sponsor" />;
}
