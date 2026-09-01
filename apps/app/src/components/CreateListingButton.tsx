"use client";

import { useRouter } from "next/navigation";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Plus } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { isSuperadmin } from "@/lib/api";
import { Button } from "@/components/ui";
import type { ButtonSize, ButtonVariant } from "@/components/ui";

/**
 * The seller-side entry point. Open to anyone with a session for now —
 * social verification will gate it later, which is why the check lives here
 * rather than being spread across the pages that render the button.
 */
export function CreateListingButton({
  size = "md",
  variant = "primary",
  label = "Create Listing",
  className,
}: {
  size?: ButtonSize;
  variant?: ButtonVariant;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const { status, user } = useSession();
  const { openConnectModal } = useConnectModal();

  if (!isSuperadmin(user)) return null;

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      onClick={() => {
        if (status === "authenticated") router.push("/listings/new");
        else openConnectModal?.();
      }}
    >
      <Plus className="w-4 h-4" />
      {label}
    </Button>
  );
}
