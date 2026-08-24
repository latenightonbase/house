import type { ReactNode } from "react";
import { Tile } from "./Card";
import { PanelLabel } from "./PanelLabel";

type Tone = "default" | "positive" | "warning" | "accent";

const TONE_CLASS: Record<Tone, string> = {
  default: "text-foreground",
  positive: "text-positive",
  warning: "text-warning",
  accent: "text-primary-light",
};

type Props = {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  tone?: Tone;
  className?: string;
};

export function StatTile({ label, value, caption, tone = "default", className = "" }: Props) {
  return (
    <Tile className={`px-3.5 py-3 ${className}`}>
      <PanelLabel>{label}</PanelLabel>
      <p className={`mt-1 numeric text-[22px] font-bold ${TONE_CLASS[tone]}`}>{value}</p>
      {caption ? <p className="mt-1 text-[11px] text-caption">{caption}</p> : null}
    </Tile>
  );
}
