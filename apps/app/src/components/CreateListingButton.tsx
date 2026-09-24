"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useOpenConnect } from "@/components/connect-intent";
import { useSession } from "@/components/SessionProvider";
import { Button } from "@/components/ui";
import type { ButtonSize, ButtonVariant } from "@/components/ui";

/**
 * The seller-side entry point, open to everyone. An admin's listing goes live
 * as soon as they sign for it; anyone else's is submitted for review first,
 * which the form itself explains — so nothing is gated here.
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
  const { status } = useSession();
  const openConnect = useOpenConnect();

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      onClick={() => {
        if (status === "authenticated") router.push("/listings/new");
        else openConnect();
      }}
    >
      <Plus className="w-4 h-4" />
      {label}
    </Button>
  );
}
