"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { Check, Copy } from "lucide-react";
import { SocialCards } from "@/components/SocialCards";
import { useSession } from "@/components/SessionProvider";
import { Badge, BrandAvatar, Tile } from "@/components/ui";
import { shortAddress, walletFallbackAvatar } from "@/lib/utils";

export default function DashboardClient() {
  const { address, isConnected } = useAccount();
  const { status, user, refresh } = useSession();
  const searchParams = useSearchParams();
  const linked = searchParams.get("linked");
  const error = searchParams.get("error");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (linked || error) {
      void refresh();
    }
  }, [linked, error, refresh]);

  const primary = user?.wallets.find((w) => w.isPrimary) || user?.wallets[0];
  const primarySocial = user?.socials.find((s) => s.avatarUrl) || user?.socials[0];
  const identityName =
    (user?.username ? `@${user.username}` : null) ||
    primarySocial?.displayName ||
    primarySocial?.username ||
    (primary ? shortAddress(primary.address) : "Your profile");
  const identityAvatar =
    user?.avatarUrl || primarySocial?.avatarUrl || walletFallbackAvatar(primary?.address);

  const copyAddress = () => {
    if (!primary) return;
    void navigator.clipboard.writeText(primary.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <section className="card p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <BrandAvatar
            src={identityAvatar}
            alt={identityName}
            shape="square"
            fallbackSeed={primary?.address || identityName}
            size={56}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
              {status === "authenticated" ? identityName : "Your profile"}
            </h1>
            {status === "loading" ? (
              <div className="mt-1.5 h-4 w-32 rounded bg-white/[0.04] animate-pulse" />
            ) : status === "authenticated" && primary ? (
              <div className="mt-1 flex items-center gap-1.5">
                <p className="text-[12px] text-caption truncate">
                  {shortAddress(primary.address)}
                </p>
                <button
                  type="button"
                  onClick={copyAddress}
                  aria-label="Copy wallet address"
                  className="shrink-0 text-caption hover:text-white transition-colors"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-positive" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            ) : isConnected && address ? (
              <p className="mt-1 text-[12px] text-warning">
                Wallet connected — finish the signature prompt to authenticate.
              </p>
            ) : (
              <p className="mt-1 text-[12px] text-caption">Not signed in.</p>
            )}
          </div>
          {status === "authenticated" ? (
            <Badge variant="positive" className="shrink-0">
              Signed in
            </Badge>
          ) : null}
        </div>
      </section>

      {linked ? (
        <Tile className="border-positive/30 bg-positive/10 px-4 py-3 text-[13px] text-positive">
          Linked {linked.toUpperCase()} successfully.
        </Tile>
      ) : null}
      {error ? (
        <Tile className="border-negative/30 bg-negative/10 px-4 py-3 text-[13px] text-negative">
          {error}
        </Tile>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-[15px] font-bold text-foreground">Platforms</h2>
          <p className="text-[12px] text-caption mt-0.5">
            Link once, refresh anytime for the latest counts.
          </p>
        </div>
        <SocialCards />
      </section>
    </div>
  );
}
