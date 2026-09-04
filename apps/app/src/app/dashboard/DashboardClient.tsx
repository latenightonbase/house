"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useAccount } from "wagmi";
import { Check, Copy } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { Badge, BrandAvatar, Button, Field, ImageUploader, TextInput, Tile } from "@/components/ui";
import {
  requestEmailOtp,
  updateProfile,
  verifyEmailOtp,
} from "@/lib/api";
import { shortAddress, walletFallbackAvatar } from "@/lib/utils";

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function DashboardClient() {
  const { address, isConnected } = useAccount();
  const { status, user, refresh } = useSession();
  const usernameId = useId();
  const emailId = useId();
  const otpId = useId();
  const primary = user?.wallets.find((w) => w.isPrimary) || user?.wallets[0];
  const [username, setUsername] = useState(user?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState(user?.email ?? "");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  useEffect(() => {
    setUsername(user?.username ?? "");
    setEmail(user?.email ?? "");
    setAvatarUrl(undefined);
    setOtpSent(false);
    setCode("");
  }, [user?.id, user?.username, user?.email, user?.emailVerifiedAt]);

  const identityName =
    (user?.username ? `@${user.username}` : null) ||
    (primary ? shortAddress(primary.address) : "Your profile");
  const usernameValid = USERNAME_RE.test(username.trim());
  const emailBlank = !email.trim();
  const emailValid = EMAIL_RE.test(email.trim());
  const emailDirty = email.trim().toLowerCase() !== (user?.email ?? "").toLowerCase();
  const needsEmailVerify = !emailBlank && (emailDirty || !user?.emailVerifiedAt);
  const emailVerified = Boolean(user?.emailVerifiedAt) && !emailDirty;

  const copyAddress = () => {
    if (!primary) return;
    void navigator.clipboard.writeText(primary.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onSendOtp = async () => {
    if (!emailValid || sendingOtp) return;
    setSendingOtp(true);
    setError(null);
    setNotice(null);
    try {
      await requestEmailOtp(email.trim());
      setOtpSent(true);
      setCode("");
      setNotice("We sent a 6-digit code to that address.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!usernameValid || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (needsEmailVerify) {
        if (!otpSent) {
          await requestEmailOtp(email.trim());
          setOtpSent(true);
          setNotice("We sent a 6-digit code. Enter it to confirm the new email.");
          return;
        }
        await verifyEmailOtp(email.trim(), code.trim());
      }
      await updateProfile({
        username: username.trim(),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      });
      await refresh();
      setAvatarUrl(undefined);
      setOtpSent(false);
      setCode("");
      setNotice("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
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

      {status === "authenticated" ? (
        <form onSubmit={onSave} className="card p-4 sm:p-6 space-y-5">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Profile</h2>
            <p className="text-[12px] text-caption mt-0.5">
              Picture and username. Email is optional — add one to get bid updates.
            </p>
          </div>

          <ImageUploader
            variant="avatar"
            value={avatarUrl === undefined ? user?.avatarUrl : avatarUrl}
            onUploaded={setAvatarUrl}
            fallbackSeed={primary?.address || username || user?.id}
            alt={username || "Profile picture"}
          />

          <Field
            label="Username"
            htmlFor={usernameId}
            error={
              username && !usernameValid
                ? "3–20 characters, start with a letter, letters/numbers/underscores only."
                : undefined
            }
          >
            <TextInput
              id={usernameId}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              spellCheck={false}
              maxLength={20}
            />
          </Field>

          <Field
            label="Email"
            htmlFor={emailId}
            optional={!emailVerified}
            hint={
              emailVerified
                ? "Verified. You'll get bid updates at this address."
                : "Add and verify an email to get updates on your bids."
            }
            error={email && !emailValid ? "Enter a valid email address." : undefined}
          >
            <TextInput
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setOtpSent(false);
                setCode("");
              }}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>

          {otpSent && needsEmailVerify ? (
            <Field label="Verification code" htmlFor={otpId}>
              <TextInput
                id={otpId}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                maxLength={6}
              />
            </Field>
          ) : null}

          {notice ? <p className="text-[12px] text-positive">{notice}</p> : null}
          {error ? <p className="text-[12px] text-negative">{error}</p> : null}

          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            {needsEmailVerify && emailValid ? (
              <Button
                type="button"
                variant="accent-outline"
                className="w-full sm:w-auto"
                disabled={sendingOtp}
                onClick={() => void onSendOtp()}
              >
                {sendingOtp ? "Sending…" : otpSent ? "Resend code" : "Send verification code"}
              </Button>
            ) : null}
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={!usernameValid || (!emailBlank && !emailValid) || saving}
            >
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      ) : null}

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
