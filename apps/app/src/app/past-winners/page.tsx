import type { Metadata } from "next";
import { PastWinnersClient } from "./PastWinnersClient";

export const metadata: Metadata = {
  title: "Past Winners — LNOC",
  description: "Every project that has held the LNOC billboard.",
};

export default function PastWinnersPage() {
  return <PastWinnersClient />;
}
