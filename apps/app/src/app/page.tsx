import { Suspense } from "react";
import HomeClient from "./HomeClient";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="card p-6 max-w-3xl">
          <div className="h-8 w-2/3 rounded bg-white/[0.04] animate-pulse" />
        </div>
      }
    >
      <HomeClient />
    </Suspense>
  );
}
