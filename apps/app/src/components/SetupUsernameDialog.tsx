"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { BrandAvatar } from "@/components/ui/BrandAvatar";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { updateProfile, type PublicUser } from "@/lib/api";
import { resizeImageToDataUrl } from "@/lib/resizeImage";
import { walletFallbackAvatar } from "@/lib/utils";

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;

function suggestUsername(socialUsername?: string | null): string {
  if (!socialUsername) return "";
  const cleaned = socialUsername
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9_]/g, "");
  const withLetter = /^[a-z]/.test(cleaned) ? cleaned : cleaned ? `u${cleaned}` : "";
  return withLetter.slice(0, 20);
}

export function SetupUsernameDialog() {
  const { status, user, refresh } = useSession();
  if (status !== "authenticated" || !user || user.username) return null;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const social = user.socials.find((s) => s.username || s.avatarUrl);
  const [username, setUsername] = useState(() => suggestUsername(social?.username));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const primary = user.wallets.find((w) => w.isPrimary) || user.wallets[0];

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const valid = USERNAME_RE.test(username.trim());
  const previewSrc = avatarUrl || social?.avatarUrl || walletFallbackAvatar(primary?.address);

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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
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
          Choose a username so others can find you. A photo is optional.
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
            username && !valid
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

        {error ? <p className="mt-3 text-[12px] text-negative">{error}</p> : null}

        <Button type="submit" className="mt-5 w-full" disabled={!valid || saving}>
          {saving ? "Saving…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
