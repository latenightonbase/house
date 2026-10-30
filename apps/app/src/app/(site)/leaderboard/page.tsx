import type { Metadata } from "next";
import { LeaderboardClient } from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Leaderboard — LNOC",
  description: "The projects competing hardest for attention.",
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
