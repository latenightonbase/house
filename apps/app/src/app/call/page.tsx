import type { Metadata } from "next";
import { SITE } from "@/lib/constants";
import CallClient from "./CallClient";

export const metadata: Metadata = {
  title: `Book a call with Bill — ${SITE.shortName}`,
  description: "Pay in USDG or LNOC and pick a 30-minute slot on Bill's calendar.",
};

export default function CallPage() {
  return <CallClient />;
}
