"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useSession } from "@/components/SessionProvider";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { updateProfile, type PublicUser } from "@/lib/api";

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

function needsSetup(user: PublicUser) {
  return !user.username;
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
  const social = user.socials.find((s) => s.username || s.avatarUrl);
  const [username, setUsername] = useState(() => user.username || suggestUsername(social?.username));
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(undefined);
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

  const usernameValid = USERNAME_RE.test(username.trim());

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!usernameValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        username: username.trim(),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
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
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-profile-title"
    >
      <form
        onSubmit={onSubmit}
        className="card w-full max-w-md max-h-[min(92dvh,100%)] overflow-y-auto rounded-b-none sm:rounded-xl p-5 sm:p-6 pb-[max(1.25rem,var(--safe-bottom))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      >
        <h2 id="setup-profile-title" className="text-lg font-bold tracking-tight text-white">
          Set up your profile
        </h2>
        <p className="mt-1.5 text-[13px] leading-snug text-caption">
          Choose a username. A photo is optional.
        </p>

        <div className="mt-5">
          <ImageUploader
            variant="avatar"
            value={avatarUrl === undefined ? user.avatarUrl || social?.avatarUrl : avatarUrl}
            onUploaded={setAvatarUrl}
            fallbackSeed={primary?.address || username || user.id}
            alt={username || "Profile picture"}
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

        {error ? <p className="mt-3 text-[12px] text-negative">{error}</p> : null}

        <div className="mt-5">
          <Button type="submit" className="w-full" disabled={!usernameValid || saving}>
            {saving ? "Saving…" : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
