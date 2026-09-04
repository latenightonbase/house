import HomeClient from "./HomeClient";
import { loadHomePageData } from "@/lib/home-data";

export const revalidate = 20;

export default async function HomePage() {
  const initial = await loadHomePageData();
  return <HomeClient {...initial} />;
}
