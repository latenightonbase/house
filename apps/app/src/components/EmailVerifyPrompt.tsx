"use client";

import { useId, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { requestEmailOtp, verifyEmailOtp } from "@/lib/api";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailVerifyPrompt({
  title = "Want to receive updates on this bid? Add your email and verify it",
  description,
  onSkip,
  skipLabel = "Skip for now",
  onVerified,
  className,
}: {
  title?: string;
  description?: string;
  onSkip?: () => void;
  skipLabel?: string;
  onVerified?: () => void;
  className?: string;
}) {
  const { user, refresh } = useSession();
  const emailId = useId();
  const otpId = useId();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  if (user?.emailVerifiedAt) return null;

  const emailValid = EMAIL_RE.test(email.trim());
  const codeValid = /^\d{6}$/.test(code.trim());

  const sendCode = async () => {
    if (!emailValid || sending) return;
    setSending(true);
    setError(null);
    try {
      await requestEmailOtp(email.trim());
      setOtpSent(true);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (!emailValid || !codeValid || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      await verifyEmailOtp(email.trim(), code.trim());
      await refresh();
      onVerified?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify code.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={cn("text-left", className)}>
      {title ? <p className="text-[14px] font-semibold text-white leading-snug">{title}</p> : null}
      {description ? (
        <p className="mt-1 text-[13px] text-caption leading-relaxed">{description}</p>
      ) : null}

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
            setOtpSent(false);
            setCode("");
          }}
          autoComplete="email"
          placeholder="you@example.com"
        />
      </Field>

      {otpSent ? (
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

      <div className="mt-4 flex flex-col gap-2">
        {emailValid ? (
          <Button
            type="button"
            variant="accent-outline"
            className="w-full"
            disabled={sending}
            onClick={() => void sendCode()}
          >
            {sending ? "Sending…" : otpSent ? "Resend code" : "Send verification code"}
          </Button>
        ) : null}
        {otpSent ? (
          <Button
            type="button"
            className="w-full"
            disabled={!codeValid || verifying}
            onClick={() => void verify()}
          >
            {verifying ? "Verifying…" : "Verify email"}
          </Button>
        ) : null}
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="h-11 rounded-lg text-[13px] font-semibold text-caption hover:text-white transition-colors"
          >
            {skipLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
