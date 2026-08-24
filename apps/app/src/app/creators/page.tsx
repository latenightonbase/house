"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { TrendingCreators } from "@/components/dashboard/TrendingCreators";
import { fetchCreators, type Earner } from "@/lib/marketplace";

export default function CreatorsPage() {
  const router = useRouter();
  const [creators, setCreators] = useState<Earner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCreators(50)
      .then((data) => !cancelled && setCreators(data))
      .catch(() => !cancelled && setCreators([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Creators"
        subtitle="Everyone selling attention on LNOC — their verified reach, engagement and what it costs to work with them."
      />
      <TrendingCreators
        creators={creators}
        loading={loading}
        onOpenCreator={(id) => router.push(`/creators/${id}`)}
      />
    </div>
  );
}
