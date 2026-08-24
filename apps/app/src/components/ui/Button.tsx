"use client";

import type { ButtonHTMLAttributes } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./buttonStyles";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className = "", ...props }: Props) {
  return (
    <button
      type="button"
      className={`${buttonClass(variant, size, className)} disabled:opacity-50`}
      {...props}
    />
  );
}
