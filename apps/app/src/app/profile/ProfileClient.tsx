"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { SocialCards } from "@/components/SocialCards";
import { useSession } from "@/components/SessionProvider";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ProfileClient() {
  const { address, isConnected } = useAccount();
  const { status, user, refresh } = useSession();
  const searchParams = useSearchParams();
  const linked = searchParams.get("linked");
  const error = searchParams.get("error");

  useEffect(() => {
    if (linked || error) {
      void refresh();
    }
  }, [linked, error, refresh]);

  const primary = user?.wallets.find((w) => w.isPrimary) || user?.wallets[0];
  const verifiedCount = user?.socials.length ?? 0;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Hero — matches apps/web profile header treatment */}
      <section className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-primary/30 p-5 sm:p-6">
        <p className="panel-label mb-3">Identity</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-primary bg-surface shadow-lg shadow-primary/20 text-lg font-bold text-primary-light">
            {primary ? primary.address.slice(2, 4).toUpperCase() : "??"}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {status === "authenticated" && primary
                ? shortAddr(primary.address)
                : "Your profile"}
            </h1>
            <p className="text-[13px] text-caption">
              Wallet session and verified social accounts with live reach metrics.
            </p>
            <div className="flex flex-wrap gap-2">
              {status === "authenticated" ? (
                <span className="badge badge-positive">Signed in</span>
              ) : (
                <span className="badge badge-warning">Not signed in</span>
              )}
              <span className="badge badge-accent">
                {verifiedCount} social{verifiedCount === 1 ? "" : "s"} linked
              </span>
              {primary ? (
                <span className="badge badge-neutral">Chain {primary.chainId}</span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {linked ? (
        <div className="tile border-positive/30 bg-positive/10 px-4 py-3 text-[13px] text-positive">
          Linked {linked.toUpperCase()} successfully.
        </div>
      ) : null}
      {error ? (
        <div className="tile border-negative/30 bg-negative/10 px-4 py-3 text-[13px] text-negative">
          {error}
        </div>
      ) : null}

      <section className="card p-4 sm:p-5 space-y-3">
        <p className="panel-label">Wallet</p>
        {status === "loading" ? (
          <div className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
        ) : status === "authenticated" && primary ? (
          <div className="tile p-4 space-y-1">
            <p className="font-mono text-[13px] text-foreground break-all">
              {primary.address}
            </p>
            <p className="text-[11px] text-caption">
              User {user?.id} · verified{" "}
              {new Date(primary.verifiedAt).toLocaleString()}
            </p>
          </div>
        ) : isConnected && address ? (
          <p className="text-[13px] text-warning">
            Wallet connected ({shortAddr(address)}) — finish the SIWE signature
            prompt to authenticate.
          </p>
        ) : (
          <p className="text-[13px] text-caption">
            Not signed in. Use Connect in the sidebar or header.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="panel-label">Social verification</p>
            <p className="mt-1 text-[15px] font-bold text-foreground">
              Platforms
            </p>
            <p className="text-[12px] text-caption mt-0.5">
              One-time link or periodic refresh for latest counts — not sign-in.
            </p>
          </div>
        </div>
        <SocialCards />
      </section>
    </div>
  );
}
