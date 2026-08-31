"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { BrandAvatar } from "@/components/ui/BrandAvatar";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import {
  requestEmailOtp,
  updateProfile,
  verifyEmailOtp,
  type PublicUser,
} from "@/lib/api";
import { resizeImageToDataUrl } from "@/lib/resizeImage";
import { walletFallbackAvatar } from "@/lib/utils";

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function suggestUsername(socialUsername?: string | null): string {
  if (!socialUsername) return "";
  const cleaned = socialUsername
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9_]/g, "");
  const withLetter = /^[a-z]/.test(cleaned) ? cleaned : cleaned ? `u${cleaned}` : "";
  return withLetter.slice(0, 20);
}

function needsSetup(user: PublicUser) {
  return !user.username || !user.emailVerifiedAt;
}

export function SetupUsernameDialog() {
  const { status, user, refresh } = useSession();
  if (status !== "authenticated" || !user || !needsSetup(user)) return null;
  return <SetupUsernameForm key={user.id} user={user} refresh={refresh} />;
}

function SetupUsernameForm({
  user,
  refresh,
}: {
  user: PublicUser;
  refresh: () => Promise<void>;
}) {
  const usernameId = useId();
  const emailId = useId();
  const otpId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const social = user.socials.find((s) => s.username || s.avatarUrl);
  const [username, setUsername] = useState(() => user.username || suggestUsername(social?.username));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState(user.email ?? "");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(Boolean(user.emailVerifiedAt));
  const [emailVerified, setEmailVerified] = useState(Boolean(user.emailVerifiedAt));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const primary = user.wallets.find((w) => w.isPrimary) || user.wallets[0];

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const usernameValid = USERNAME_RE.test(username.trim());
  const emailValid = EMAIL_RE.test(email.trim());
  const previewSrc = avatarUrl || user.avatarUrl || social?.avatarUrl || walletFallbackAvatar(primary?.address);

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    try {
      setError(null);
      setAvatarUrl(await resizeImageToDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process image.");
    }
  };

  const onSendOtp = async () => {
    if (!emailValid || sendingOtp) return;
    setSendingOtp(true);
    setError(null);
    try {
      await requestEmailOtp(email.trim());
      setOtpSent(true);
      setEmailVerified(false);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!usernameValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (!emailVerified) {
        if (!otpSent) {
          await requestEmailOtp(email.trim());
          setOtpSent(true);
          return;
        }
        await verifyEmailOtp(email.trim(), code.trim());
        setEmailVerified(true);
      }
      await updateProfile({
        username: username.trim(),
        ...(avatarUrl ? { avatarUrl } : {}),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const canContinue = usernameValid && emailValid && (emailVerified || (otpSent ? /^\d{6}$/.test(code.trim()) : true));

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-profile-title"
    >
      <form
        onSubmit={onSubmit}
        className="card w-full max-w-md p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      >
        <h2 id="setup-profile-title" className="text-lg font-bold tracking-tight text-white">
          Set up your profile
        </h2>
        <p className="mt-1.5 text-[13px] leading-snug text-caption">
          Choose a username and verify your email. A photo is optional.
        </p>

        <div className="mt-5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Upload profile picture"
          >
            <BrandAvatar
              key={previewSrc}
              src={previewSrc}
              alt={username || "Profile picture"}
              fallbackSeed={primary?.address || username || user.id}
              size={72}
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
            </span>
          </button>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white">Profile picture</p>
            <p className="mt-0.5 text-[11px] text-caption">Optional. JPEG, PNG, or WebP.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1.5 text-[12px] font-semibold text-primary-light hover:text-white"
            >
              {avatarUrl ? "Change photo" : "Upload photo"}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              void onPickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <Field
          label="Username"
          htmlFor={usernameId}
          error={
            username && !usernameValid
              ? "3–20 characters, start with a letter, letters/numbers/underscores only."
              : undefined
          }
          className="mt-5"
        >
          <TextInput
            id={usernameId}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            spellCheck={false}
            placeholder="yourname"
            maxLength={20}
          />
        </Field>

        <Field
          label="Email"
          htmlFor={emailId}
          error={email && !emailValid ? "Enter a valid email address." : undefined}
          className="mt-4"
        >
          <TextInput
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailVerified(false);
              setOtpSent(false);
              setCode("");
            }}
            autoComplete="email"
            placeholder="you@example.com"
            disabled={emailVerified}
          />
        </Field>

        {otpSent && !emailVerified ? (
          <Field label="Verification code" htmlFor={otpId} className="mt-4">
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

        {error ? <p className="mt-3 text-[12px] text-negative">{error}</p> : null}

        <div className="mt-5 flex flex-col gap-2">
          {!emailVerified && emailValid ? (
            <Button
              type="button"
              variant="accent-outline"
              className="w-full"
              disabled={sendingOtp}
              onClick={() => void onSendOtp()}
            >
              {sendingOtp ? "Sending…" : otpSent ? "Resend code" : "Send verification code"}
            </Button>
          ) : null}
          <Button type="submit" className="w-full" disabled={!canContinue || saving}>
            {saving
              ? "Saving…"
              : !emailVerified && !otpSent
                ? "Send code and continue"
                : !emailVerified
                  ? "Verify and continue"
                  : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
