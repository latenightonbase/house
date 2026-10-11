"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { BadgeCheck } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { Button, Field, ImageUploader, TextInput } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { requestEmailOtp, updateProfile, verifyEmailOtp, type PublicUser } from "@/lib/api";

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Picture, username and email in one form. The profile page opens it in a
 * dialog and the dashboard renders it inline; both used to carry their own copy
 * of the email-verification dance, which is the part most likely to drift.
 *
 * A changed email has to be verified before anything saves: the first submit
 * sends the code, the second checks it and then writes the profile.
 */
export function EditProfileForm({
  user,
  onSaved,
  onCancel,
}: {
  user: PublicUser;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const { refresh } = useSession();
  const usernameId = useId();
  const emailId = useId();
  const otpId = useId();
  const primary = user.wallets.find((w) => w.isPrimary) || user.wallets[0];
  const [username, setUsername] = useState(user.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState(user.email ?? "");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  useEffect(() => {
    setUsername(user.username ?? "");
    setEmail(user.email ?? "");
    setAvatarUrl(undefined);
    setOtpSent(false);
    setCode("");
  }, [user.id, user.username, user.email, user.emailVerifiedAt]);

  const usernameValid = USERNAME_RE.test(username.trim());
  const emailBlank = !email.trim();
  const emailValid = EMAIL_RE.test(email.trim());
  const emailDirty = email.trim().toLowerCase() !== (user.email ?? "").toLowerCase();
  const needsEmailVerify = !emailBlank && (emailDirty || !user.emailVerifiedAt);
  const emailVerified = Boolean(user.emailVerifiedAt) && !emailDirty;
  const dirty =
    username.trim() !== (user.username ?? "") || avatarUrl !== undefined || emailDirty;

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
    if (!usernameValid || saving || uploading) return;
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
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSave} className="space-y-5">
      <ImageUploader
        variant="avatar"
        shape="square"
        value={avatarUrl === undefined ? user.avatarUrl : avatarUrl}
        onUploaded={setAvatarUrl}
        onUploadingChange={setUploading}
        fallbackSeed={primary?.address || username || user.id}
        alt={username || "Profile picture"}
      />

      <Field
        label="Username"
        htmlFor={usernameId}
        hint={`Your public page: /user/${username.trim() || "yourname"}`}
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
        <div className="relative">
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
            className={emailVerified ? "pr-10" : undefined}
          />
          {emailVerified && (
            <BadgeCheck
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-positive"
              aria-label="Verified"
            />
          )}
        </div>
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
            autoFocus
          />
        </Field>
      ) : null}

      {notice ? <p className="text-[12px] text-positive">{notice}</p> : null}
      {error ? <p className="text-[12px] text-negative">{error}</p> : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="accent-outline"
            className="w-full sm:mr-auto sm:w-auto"
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
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
          disabled={
            !dirty || !usernameValid || (!emailBlank && !emailValid) || saving || uploading
          }
        >
          {saving
            ? "Saving…"
            : uploading
              ? "Uploading…"
              : otpSent && needsEmailVerify
                ? "Verify & save"
                : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

/** The profile page's way into the form: a dialog over the page it edits. */
export function EditProfileDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PublicUser;
  onSaved?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="pr-10">
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Your picture and username show on your listings, bids and public profile.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-5">
          <EditProfileForm
            user={user}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onSaved?.();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
