"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";

export default function HomeClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const { openConnectModal } = useConnectModal();
  const authRequired = searchParams.get("auth") === "required";

  useEffect(() => {
    if (authRequired && status === "authenticated") {
      router.replace("/profile");
    }
  }, [authRequired, status, router]);

  return (
    <div className="space-y-4 max-w-3xl">
      {authRequired && status !== "authenticated" ? (
        <div className="tile border-warning/30 bg-warning/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[13px] text-warning">
            Profile requires a wallet SIWE session. Social links are not sign-in.
          </p>
          <button
            type="button"
            onClick={() => openConnectModal?.()}
            className="btn-primary h-8 px-4 text-[12px] shrink-0"
          >
            Connect wallet
          </button>
        </div>
      ) : null}

      <section className="card p-6 max-lg:p-4 space-y-5">
        <p className="panel-label">Wallet · Social reach</p>
        <h1 className="gradient-text text-3xl sm:text-4xl font-bold tracking-tight max-w-xl">
          Connect your wallet. Verify your socials. Show real reach.
        </h1>
        <p className="text-[13px] text-caption max-w-lg leading-relaxed">
          Authentication is RainbowKit Sign-In with Ethereum only. Linking
          YouTube, X, Instagram, or TikTok stores reach data — it does not log
          you in.
        </p>

        <div className="flex flex-wrap gap-2">
          <span className="tile rounded-full px-3 py-1 text-[11px] font-semibold">
            <span className="accent-text">SIWE</span>
            <span className="text-caption"> auth</span>
          </span>
          <span className="tile rounded-full px-3 py-1 text-[11px] font-semibold text-caption">
            Socials = data refresh
          </span>
          <span className="tile rounded-full px-3 py-1 text-[11px] font-semibold text-caption">
            Base-first wallets
          </span>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          {status === "authenticated" ? (
            <Link
              href="/profile"
              className="gradient-button inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Open profile
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openConnectModal?.()}
              className="gradient-button inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Connect wallet
            </button>
          )}
          <a
            href="https://docs.base.org/base-account/guides/rainbowkit"
            target="_blank"
            rel="noreferrer"
            className="btn-accent-outline inline-flex h-10 items-center justify-center px-5 text-sm"
          >
            Base + RainbowKit
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            step: "01",
            title: "Connect + SIWE",
            body: "RainbowKit connects your wallet and prompts a signature. That session is your only auth.",
          },
          {
            step: "02",
            title: "Open profile",
            body: "Middleware blocks /profile without a valid SIWE cookie validated by the API.",
          },
          {
            step: "03",
            title: "Refresh socials",
            body: "OAuth links are one-time or periodic data syncs for follower counts — never login.",
          },
        ].map((item) => (
          <div key={item.step} className="card p-4 space-y-3">
            <p className="panel-label">Step {item.step}</p>
            <h2 className="text-[15px] font-bold text-foreground">{item.title}</h2>
            <p className="text-[12px] text-caption leading-relaxed">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
