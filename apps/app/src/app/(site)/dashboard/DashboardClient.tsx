"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Check, Copy } from "lucide-react";
import { MyListings } from "@/components/MyListings";
import { useSession } from "@/components/SessionProvider";
import { EditProfileForm } from "@/components/profile/EditProfileForm";
import { Badge, BrandAvatar, Tile } from "@/components/ui";
import { shortAddress, walletFallbackAvatar } from "@/lib/utils";

export default function DashboardClient() {
  const { address, isConnected } = useAccount();
  const { status, user } = useSession();
  const primary = user?.wallets.find((w) => w.isPrimary) || user?.wallets[0];
  const [copied, setCopied] = useState(false);

  const identityName =
    (user?.username ? `@${user.username}` : null) ||
    (primary ? shortAddress(primary.address) : "Your profile");

  const copyAddress = () => {
    if (!primary) return;
    void navigator.clipboard.writeText(primary.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <section className="card p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <BrandAvatar
            src={user?.avatarUrl || walletFallbackAvatar(primary?.address)}
            alt={identityName}
            shape="square"
            fallbackSeed={primary?.address || identityName}
            size={56}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
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
            <Badge variant="positive" className="shrink-0 self-start sm:self-auto">
              Signed in
            </Badge>
          ) : null}
        </div>
      </section>

      {status === "authenticated" && user ? (
        <section className="card p-4 sm:p-6 space-y-5">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Profile</h2>
            <p className="text-[12px] text-caption mt-0.5">
              Picture and username. Email is optional — add one to get bid updates.
            </p>
          </div>
          <EditProfileForm user={user} />
        </section>
      ) : null}

      {status === "authenticated" ? <MyListings /> : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-[15px] font-bold text-foreground">Platforms</h2>
          <p className="text-[12px] text-caption mt-0.5">
            Social linking is not part of v1.
          </p>
        </div>
        <Tile className="px-4 py-5 opacity-60 pointer-events-none">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-caption">Connect YouTube, X, Instagram, and TikTok.</p>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-caption">
              Coming soon
            </span>
          </div>
        </Tile>
      </section>
    </div>
  );
}
